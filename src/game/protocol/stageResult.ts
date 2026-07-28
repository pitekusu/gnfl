import type { UnloadingMetrics } from "@shared/contracts/unloadingMetrics";
import type { UnloadingScoreResult } from "@shared/scoring/scoreUnloading";
import {
  UNLOADING_RULESET_VERSION,
  UNLOADING_STAGE_ID,
} from "@shared/rulesets/unloadingV1";

/**
 * Terminal stage payload posted as COMPLETED or SAFE_ABORT.
 * `scoring` is null when aborted (not score-submittable).
 */
export interface StageResult {
  stageId: typeof UNLOADING_STAGE_ID;
  rulesetVersion: typeof UNLOADING_RULESET_VERSION | string;
  seed: string;
  completed: boolean;
  aborted: boolean;
  abortReason: string | null;
  metrics: UnloadingMetrics;
  /** Pure score breakdown; null when SAFE_ABORTED. */
  scoring: UnloadingScoreResult | null;
}
