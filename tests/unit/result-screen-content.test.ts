import { describe, expect, it } from "vitest";
import { createZeroUnloadingMetrics } from "@shared/contracts/unloadingMetrics";
import { scoreUnloading } from "@shared/scoring/scoreUnloading";
import { SCORE_CATEGORY_LABELS_JA } from "@shared/rulesets/unloadingV1";
import type { StageResult } from "@/game/protocol";
import { syntheticAbortStageResult } from "@/game/unloading/syntheticStageResult";

/**
 * Content contracts for ResultScreen (no React Testing Library yet).
 * Ensures payload shape the screen expects for complete vs abort.
 */
describe("result screen payloads", () => {
  it("complete result exposes grade score and all category labels", () => {
    const metrics = createZeroUnloadingMetrics();
    const scoring = scoreUnloading(metrics);
    const result: StageResult = {
      stageId: "unloading",
      rulesetVersion: "unloading-v1",
      seed: "fixture",
      completed: true,
      aborted: false,
      abortReason: null,
      metrics,
      scoring,
    };
    expect(result.scoring?.grade).toBeDefined();
    expect(result.scoring?.score).toBeGreaterThanOrEqual(0);
    expect(Object.keys(SCORE_CATEGORY_LABELS_JA)).toHaveLength(5);
    expect(result.scoring?.categoryGrades.handlingQuality).toBeDefined();
  });

  it("abort result has no scoring and keeps reason", () => {
    const result = syntheticAbortStageResult("E_STOP", "seed-a");
    expect(result.aborted).toBe(true);
    expect(result.scoring).toBeNull();
    expect(result.abortReason).toBe("E_STOP");
  });
});
