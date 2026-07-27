import {
  DEFAULT_SIMULATION_CONFIG,
  isWorkerToMainMessage,
  type MainToWorkerMessage,
  type PlayerInput,
  type SimulationConfig,
  type WorkerToMainMessage,
} from "@/game/protocol";

export type SimulationClientListener = (message: WorkerToMainMessage) => void;

export interface SimulationClientOptions {
  seed?: string;
  config?: SimulationConfig;
}

/**
 * Main-thread bridge to the simulation module worker.
 * React should only subscribe to low-frequency lifecycle messages.
 */
export class SimulationClient {
  private worker: Worker | null = null;
  private readonly listeners = new Set<SimulationClientListener>();
  private disposed = false;
  private inputSequence = 0;
  private pausedByUser = false;

  public start(options: SimulationClientOptions = {}): void {
    if (this.disposed) {
      throw new Error("SimulationClient already disposed");
    }
    if (this.worker) {
      throw new Error("SimulationClient already started");
    }

    this.worker = new Worker(new URL("./simulation.worker.ts", import.meta.url), {
      type: "module",
    });

    this.worker.onmessage = (event: MessageEvent<unknown>) => {
      if (!isWorkerToMainMessage(event.data)) {
        return;
      }
      for (const listener of this.listeners) {
        listener(event.data);
      }
    };

    this.worker.onerror = (event: ErrorEvent) => {
      const message: WorkerToMainMessage = {
        type: "ERROR",
        code: "WORKER_ERROR",
        message: event.message || "Simulation worker error",
      };
      for (const listener of this.listeners) {
        listener(message);
      }
    };

    this.post({
      type: "INIT",
      seed: options.seed ?? "phase2-default",
      config: options.config ?? DEFAULT_SIMULATION_CONFIG,
    });
  }

  public subscribe(listener: SimulationClientListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public post(message: MainToWorkerMessage): void {
    if (!this.worker) {
      throw new Error("SimulationClient is not started");
    }
    this.worker.postMessage(message);
  }

  public pause(): void {
    this.pausedByUser = true;
    this.post({ type: "PAUSE" });
  }

  public resume(): void {
    this.pausedByUser = false;
    this.post({ type: "RESUME" });
  }

  public togglePause(): void {
    if (this.pausedByUser) {
      this.resume();
      return;
    }
    this.pause();
  }

  public isPausedByUser(): boolean {
    return this.pausedByUser;
  }

  /** Send the latest control axes; sequence prevents replaying edge buttons. */
  public sendInput(input: PlayerInput): void {
    this.inputSequence += 1;
    this.post({
      type: "INPUT",
      sequence: this.inputSequence,
      input,
    });
  }

  public reset(
    seed: string,
    config: SimulationConfig = DEFAULT_SIMULATION_CONFIG,
  ): void {
    this.post({ type: "RESET", seed, config });
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    try {
      this.worker?.postMessage({ type: "DISPOSE" } satisfies MainToWorkerMessage);
    } catch {
      // Worker may already be terminated.
    }
    this.worker?.terminate();
    this.worker = null;
    this.listeners.clear();
  }
}
