import { describe, expect, it } from "vitest";
import { createZeroUnloadingMetrics } from "@shared/contracts/unloadingMetrics";
import { scoreUnloading } from "@shared/scoring/scoreUnloading";
import { formatStageEndBanner } from "@/game/unloading/stageEndBanner";
import type { StageResult } from "@/game/protocol";

describe("formatStageEndBanner", () => {
  it("shows abort without score", () => {
    const result: StageResult = {
      stageId: "unloading",
      rulesetVersion: "unloading-v1",
      seed: "s",
      completed: false,
      aborted: true,
      abortReason: "E_STOP",
      metrics: createZeroUnloadingMetrics(),
      scoring: null,
    };
    expect(formatStageEndBanner(result)).toContain("安全中止");
    expect(formatStageEndBanner(result)).toContain("E_STOP");
    expect(formatStageEndBanner(result)).toContain("登録不可");
  });

  it("shows grade and score on complete", () => {
    const metrics = createZeroUnloadingMetrics();
    const scoring = scoreUnloading(metrics);
    const result: StageResult = {
      stageId: "unloading",
      rulesetVersion: "unloading-v1",
      seed: "s",
      completed: true,
      aborted: false,
      abortReason: null,
      metrics,
      scoring,
    };
    const text = formatStageEndBanner(result);
    expect(text).toContain("完了");
    expect(text).toContain(scoring.grade);
    expect(text).toContain(scoring.score.toLocaleString("ja-JP"));
  });
});
