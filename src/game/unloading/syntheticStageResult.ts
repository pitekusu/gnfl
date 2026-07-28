import { createZeroUnloadingMetrics } from "@shared/contracts/unloadingMetrics";
import {
  UNLOADING_RULESET_VERSION,
  UNLOADING_STAGE_ID,
} from "@shared/rulesets/unloadingV1";
import type { StageResult } from "@/game/protocol";

/** Minimal abort payload when only HUD phase is known (no full worker result yet). */
export function syntheticAbortStageResult(
  abortReason: string | null,
  seed = "",
): StageResult {
  return {
    stageId: UNLOADING_STAGE_ID,
    rulesetVersion: UNLOADING_RULESET_VERSION,
    seed,
    completed: false,
    aborted: true,
    abortReason,
    metrics: createZeroUnloadingMetrics(),
    scoring: null,
  };
}

/** Minimal complete payload without scoring (rare fallback). */
export function syntheticCompleteStageResult(seed = ""): StageResult {
  return {
    stageId: UNLOADING_STAGE_ID,
    rulesetVersion: UNLOADING_RULESET_VERSION,
    seed,
    completed: true,
    aborted: false,
    abortReason: null,
    metrics: createZeroUnloadingMetrics(),
    scoring: null,
  };
}
