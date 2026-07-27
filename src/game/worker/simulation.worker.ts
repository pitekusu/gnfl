/// <reference lib="webworker" />

import {
  isMainToWorkerMessage,
  type MainToWorkerMessage,
  type SimulationConfig,
  type WorkerToMainMessage,
} from "@/game/protocol";
import {
  advanceFixedStep,
  createFixedStepState,
  physicsDtSeconds,
  type FixedStepState,
} from "@/game/simulation/fixedStep";
import { initRapier, type RapierModule } from "@/game/simulation/rapierInit";
import { SimulationController } from "@/game/simulation/simulationController";
import { shouldEmitSnapshot } from "@/game/simulation/snapshotSchedule";
import { UnloadingScaffoldWorld } from "@/game/unloading/scaffoldWorld";

let rapier: RapierModule | null = null;
let stageWorld: UnloadingScaffoldWorld | null = null;
let config: SimulationConfig | null = null;
let stepState: FixedStepState = createFixedStepState();
let lastFrameMs = 0;
let loopTimer: ReturnType<typeof setTimeout> | null = null;
let loopRunning = false;

const controller = new SimulationController({
  onInit: async (seed, nextConfig) => {
    void seed;
    rapier = await initRapier();
    rebuildWorld(nextConfig);
  },
  onReset: async (seed, nextConfig) => {
    void seed;
    if (!rapier) {
      rapier = await initRapier();
    }
    rebuildWorld(nextConfig);
    lastFrameMs = performance.now();
  },
  onDispose: () => {
    stopLoop();
    stageWorld?.free();
    stageWorld = null;
    config = null;
  },
  onPause: () => {
    // Wall clock resumes cleanly on next RESUME via lastFrameMs reset in onResume.
  },
  onResume: () => {
    lastFrameMs = performance.now();
  },
});

function rebuildWorld(nextConfig: SimulationConfig): void {
  if (!rapier) {
    throw new Error("Rapier is not initialized");
  }
  stageWorld?.free();
  config = nextConfig;
  // Phase 2 C1: scaffold only (quay). Crane pieces arrive in later commits.
  stageWorld = UnloadingScaffoldWorld.create(
    rapier,
    nextConfig.gravityY,
    nextConfig.physicsHz,
  );
  stepState = createFixedStepState();
  post({
    type: "SNAPSHOT",
    snapshot: stageWorld.buildSnapshot(0, performance.now()),
  });
}

function startLoop(): void {
  if (loopRunning) {
    return;
  }
  loopRunning = true;
  lastFrameMs = performance.now();
  scheduleNextFrame();
}

function stopLoop(): void {
  loopRunning = false;
  if (loopTimer !== null) {
    clearTimeout(loopTimer);
    loopTimer = null;
  }
}

function scheduleNextFrame(): void {
  if (!loopRunning) {
    return;
  }
  loopTimer = setTimeout(frame, 1000 / 240);
}

function frame(): void {
  loopTimer = null;
  if (!loopRunning) {
    return;
  }

  const now = performance.now();
  const elapsedSeconds = (now - lastFrameMs) / 1000;
  lastFrameMs = now;

  if (!controller.isPaused && stageWorld && config && !controller.isDisposed) {
    const advanced = advanceFixedStep(stepState, elapsedSeconds, {
      dtSeconds: physicsDtSeconds(config.physicsHz),
      maxCatchUpTicks: config.maxCatchUpTicks,
    });
    stepState = advanced.state;

    for (let i = 0; i < advanced.steps; i += 1) {
      stageWorld.step();
      const tickAfter = stepState.tick - advanced.steps + i + 1;

      if (shouldEmitSnapshot(tickAfter, config.physicsHz, config.snapshotHz)) {
        post({
          type: "SNAPSHOT",
          snapshot: stageWorld.buildSnapshot(tickAfter, performance.now()),
        });
      }
    }
  }

  scheduleNextFrame();
}

function post(message: WorkerToMainMessage): void {
  self.postMessage(message);
}

self.onmessage = (event: MessageEvent<unknown>) => {
  const data = event.data;
  if (!isMainToWorkerMessage(data)) {
    post({
      type: "ERROR",
      code: "INVALID_MESSAGE",
      message: "Main thread sent an invalid message shape",
    });
    return;
  }

  void handleMessage(data);
};

async function handleMessage(message: MainToWorkerMessage): Promise<void> {
  const replies = await controller.handle(message);
  for (const reply of replies) {
    post(reply);
  }

  if (
    (message.type === "INIT" || message.type === "RESET") &&
    replies.some((reply) => reply.type === "READY")
  ) {
    startLoop();
  }

  if (message.type === "DISPOSE") {
    stopLoop();
  }
}

export {};
