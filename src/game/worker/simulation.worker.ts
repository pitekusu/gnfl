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
import { GreyboxDemoWorld } from "@/game/simulation/greyboxDemoWorld";
import { initRapier, type RapierModule } from "@/game/simulation/rapierInit";
import { SimulationController } from "@/game/simulation/simulationController";
import { shouldEmitSnapshot } from "@/game/simulation/snapshotSchedule";

let rapier: RapierModule | null = null;
let demoWorld: GreyboxDemoWorld | null = null;
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
    startLoop();
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
    demoWorld?.free();
    demoWorld = null;
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
  demoWorld?.free();
  config = nextConfig;
  demoWorld = GreyboxDemoWorld.create(rapier, nextConfig.gravityY);
  stepState = createFixedStepState();
  // Emit an initial pose so the renderer has something before the first step.
  post({
    type: "SNAPSHOT",
    snapshot: demoWorld.buildSnapshot(0, performance.now()),
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
  // ~240 Hz host wakeups keep the 120 Hz accumulator fed without relying on exact timers.
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

  if (!controller.isPaused && demoWorld && config && controller.isReady) {
    const advanced = advanceFixedStep(stepState, elapsedSeconds, {
      dtSeconds: physicsDtSeconds(config.physicsHz),
      maxCatchUpTicks: config.maxCatchUpTicks,
    });
    stepState = advanced.state;

    for (let i = 0; i < advanced.steps; i += 1) {
      demoWorld.step();
      const tickAfter = stepState.tick - advanced.steps + i + 1;
      if (shouldEmitSnapshot(tickAfter, config.physicsHz, config.snapshotHz)) {
        post({
          type: "SNAPSHOT",
          snapshot: demoWorld.buildSnapshot(tickAfter, performance.now()),
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
}

export {};
