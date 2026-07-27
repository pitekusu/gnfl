export { PROTOCOL_VERSION } from "@/game/protocol/protocolVersion";
export type { StagePhase } from "@/game/protocol/stagePhase";
export type { PlayerInput } from "@/game/protocol/playerInput";
export { createNeutralPlayerInput } from "@/game/protocol/playerInput";
export type { SimulationConfig } from "@/game/protocol/simulationConfig";
export { DEFAULT_SIMULATION_CONFIG } from "@/game/protocol/simulationConfig";
export type {
  InstrumentState,
  RenderEntityState,
  RenderSnapshot,
  WeatherVisualState,
} from "@/game/protocol/renderSnapshot";
export { createEmptyRenderSnapshot } from "@/game/protocol/renderSnapshot";
export type { GameEvent } from "@/game/protocol/gameEvent";
export type { StageResult } from "@/game/protocol/stageResult";
export type { UnloadingMetrics } from "@/game/protocol/unloadingMetrics";
export { createZeroUnloadingMetrics } from "@/game/protocol/unloadingMetrics";
export type {
  MainToWorkerMessage,
  WorkerToMainMessage,
} from "@/game/protocol/messages";
export { isMainToWorkerMessage, isWorkerToMainMessage } from "@/game/protocol/messages";
