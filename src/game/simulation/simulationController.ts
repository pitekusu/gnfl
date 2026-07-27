import {
  PROTOCOL_VERSION,
  type MainToWorkerMessage,
  type PlayerInput,
  type SimulationConfig,
  type WorkerToMainMessage,
  createNeutralPlayerInput,
} from "@/game/protocol";

export type SimulationControllerHooks = {
  /** Optional async init (e.g. Rapier WASM). Defaults to immediate success. */
  onInit?: (seed: string, config: SimulationConfig) => Promise<void> | void;
  onReset?: (seed: string, config: SimulationConfig) => Promise<void> | void;
  onDispose?: () => void;
  onPause?: () => void;
  onResume?: () => void;
};

/**
 * Message router for the simulation worker.
 * Keeps Rapier and timers out of pure routing tests.
 */
export class SimulationController {
  private disposed = false;
  private ready = false;
  private paused = true;
  private seed = "";
  private config: SimulationConfig | null = null;
  private lastInput: PlayerInput = createNeutralPlayerInput();
  private lastInputSequence = -1;
  private initInFlight = false;
  private readonly hooks: SimulationControllerHooks;

  public constructor(hooks: SimulationControllerHooks = {}) {
    this.hooks = hooks;
  }

  public get isReady(): boolean {
    return this.ready;
  }

  public get isPaused(): boolean {
    return this.paused;
  }

  public get isDisposed(): boolean {
    return this.disposed;
  }

  public get currentConfig(): SimulationConfig | null {
    return this.config;
  }

  public get currentSeed(): string {
    return this.seed;
  }

  public get input(): PlayerInput {
    return this.lastInput;
  }

  public async handle(message: MainToWorkerMessage): Promise<WorkerToMainMessage[]> {
    if (this.disposed) {
      return [
        {
          type: "ERROR",
          code: "DISPOSED",
          message: "Simulation worker already disposed",
        },
      ];
    }

    switch (message.type) {
      case "INIT":
        return this.handleInit(message.seed, message.config);
      case "RESET":
        return this.handleReset(message.seed, message.config);
      case "PAUSE":
        this.paused = true;
        this.hooks.onPause?.();
        return [];
      case "RESUME":
        if (!this.ready) {
          return [
            {
              type: "ERROR",
              code: "NOT_READY",
              message: "Cannot resume before INIT completes",
            },
          ];
        }
        this.paused = false;
        this.hooks.onResume?.();
        return [];
      case "INPUT":
        if (message.sequence > this.lastInputSequence) {
          this.lastInputSequence = message.sequence;
          this.lastInput = message.input;
        }
        return [];
      case "DISPOSE":
        this.disposed = true;
        this.ready = false;
        this.paused = true;
        this.hooks.onDispose?.();
        return [];
      default: {
        const _exhaustive: never = message;
        return [
          {
            type: "ERROR",
            code: "UNKNOWN_MESSAGE",
            message: `Unhandled message: ${JSON.stringify(_exhaustive)}`,
          },
        ];
      }
    }
  }

  private async handleInit(
    seed: string,
    config: SimulationConfig,
  ): Promise<WorkerToMainMessage[]> {
    if (this.ready || this.initInFlight) {
      return [
        {
          type: "ERROR",
          code: "ALREADY_INITIALIZED",
          message: "INIT already completed or in progress",
        },
      ];
    }

    this.initInFlight = true;
    try {
      await this.hooks.onInit?.(seed, config);
      this.seed = seed;
      this.config = config;
      this.ready = true;
      this.paused = false;
      this.lastInput = createNeutralPlayerInput();
      this.lastInputSequence = -1;
      return [{ type: "READY", protocolVersion: PROTOCOL_VERSION }];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "INIT failed";
      return [{ type: "ERROR", code: "INIT_FAILED", message }];
    } finally {
      this.initInFlight = false;
    }
  }

  private async handleReset(
    seed: string,
    config: SimulationConfig,
  ): Promise<WorkerToMainMessage[]> {
    if (!this.ready) {
      return [
        {
          type: "ERROR",
          code: "NOT_READY",
          message: "Cannot RESET before INIT",
        },
      ];
    }

    try {
      await this.hooks.onReset?.(seed, config);
      this.seed = seed;
      this.config = config;
      this.paused = false;
      this.lastInput = createNeutralPlayerInput();
      this.lastInputSequence = -1;
      return [{ type: "READY", protocolVersion: PROTOCOL_VERSION }];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "RESET failed";
      return [{ type: "ERROR", code: "RESET_FAILED", message }];
    }
  }
}
