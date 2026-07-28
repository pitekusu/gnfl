import type { UnloadingMetrics } from "@shared/contracts/unloadingMetrics";

/**
 * Terminal stage payload (complete or abort).
 * Score / grade attach in later Phase 5 commits; metrics are always present.
 */
export interface StageResult {
  stageId: "unloading";
  seed: string;
  completed: boolean;
  aborted: boolean;
  metrics: UnloadingMetrics;
}
