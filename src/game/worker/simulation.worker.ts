/// <reference lib="webworker" />

import {
  isMainToWorkerMessage,
  type MainToWorkerMessage,
  type WorkerToMainMessage,
} from "@/game/protocol";
import { SimulationController } from "@/game/simulation/simulationController";

const controller = new SimulationController();

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
