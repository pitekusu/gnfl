import { describe, expect, it } from "vitest";
import {
  formatStagePhaseHud,
  isLockEngagedStagePhase,
} from "@/game/unloading/stagePhaseLabels";

describe("formatStagePhaseHud", () => {
  it("formats known phases with Japanese labels", () => {
    expect(formatStagePhaseHud("READY")).toBe("準備 (READY)");
    expect(formatStagePhaseHud("LOCKED")).toBe("ロック済 (LOCKED)");
  });

  it("falls back when phase is missing", () => {
    expect(formatStagePhaseHud(undefined)).toBe("準備 (READY)");
    expect(formatStagePhaseHud("")).toBe("準備 (READY)");
    expect(formatStagePhaseHud(null)).toBe("準備 (READY)");
  });
});

describe("isLockEngagedStagePhase", () => {
  it("is true from LOCKED through SEATED", () => {
    expect(isLockEngagedStagePhase("LOCKED")).toBe(true);
    expect(isLockEngagedStagePhase("SEATED")).toBe(true);
    expect(isLockEngagedStagePhase("READY")).toBe(false);
  });
});
