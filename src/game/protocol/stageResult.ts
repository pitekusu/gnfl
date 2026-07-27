import type { UnloadingMetrics } from "@/game/protocol/unloadingMetrics";

/** Placeholder stage result until scoring lands in Phase 5. */
export interface StageResult {
  stageId: "unloading";
  seed: string;
  completed: boolean;
  aborted: boolean;
  metrics: UnloadingMetrics;
}
