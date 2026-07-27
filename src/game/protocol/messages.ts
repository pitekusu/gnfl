import type { GameEvent } from "@/game/protocol/gameEvent";
import type { PlayerInput } from "@/game/protocol/playerInput";
import type { RenderSnapshot } from "@/game/protocol/renderSnapshot";
import type { SimulationConfig } from "@/game/protocol/simulationConfig";
import type { StageResult } from "@/game/protocol/stageResult";

export type MainToWorkerMessage =
  | {
      type: "INIT";
      seed: string;
      config: SimulationConfig;
    }
  | {
      type: "INPUT";
      sequence: number;
      input: PlayerInput;
    }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | {
      type: "RESET";
      seed: string;
      config: SimulationConfig;
    }
  | { type: "DISPOSE" };

export type WorkerToMainMessage =
  | { type: "READY"; protocolVersion: number }
  | {
      type: "SNAPSHOT";
      snapshot: RenderSnapshot;
    }
  | {
      type: "GAME_EVENT";
      event: GameEvent;
    }
  | {
      type: "COMPLETED";
      result: StageResult;
    }
  | {
      type: "SAFE_ABORT";
      result: StageResult;
    }
  | {
      type: "ERROR";
      code: string;
      message: string;
    };

export function isMainToWorkerMessage(value: unknown): value is MainToWorkerMessage {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return false;
  }
  const type = (value as { type: unknown }).type;
  return (
    type === "INIT" ||
    type === "INPUT" ||
    type === "PAUSE" ||
    type === "RESUME" ||
    type === "RESET" ||
    type === "DISPOSE"
  );
}

export function isWorkerToMainMessage(value: unknown): value is WorkerToMainMessage {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return false;
  }
  const type = (value as { type: unknown }).type;
  return (
    type === "READY" ||
    type === "SNAPSHOT" ||
    type === "GAME_EVENT" ||
    type === "COMPLETED" ||
    type === "SAFE_ABORT" ||
    type === "ERROR"
  );
}
