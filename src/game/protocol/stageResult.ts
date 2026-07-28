import type { UnloadingMetrics } from "@shared/contracts/unloadingMetrics";
import type { UnloadingScoreResult } from "@shared/scoring/scoreUnloading";

/**
 * Terminal stage payload posted as COMPLETED or SAFE_ABORT.
 * `scoring` is null when aborted (not score-submittable).
 */
export interface StageResult {
  stageId: "unloading";
  rulesetVersion: string;
  seed: string;
  completed: boolean;
  aborted: boolean;
  abortReason: string | null;
  metrics: UnloadingMetrics;
  /** Pure score breakdown; null when SAFE_ABORTED. */
  scoring: UnloadingScoreResult | null;
}
