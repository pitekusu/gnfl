import { describe, expect, it } from "vitest";
import {
  SCORE_CATEGORY_IDS,
  SCORE_CATEGORY_LABELS_JA,
  UNLOADING_RULESET_V1,
  UNLOADING_RULESET_VERSION,
  assertUnloadingRulesetInvariants,
  unloadingRulesetSchema,
} from "@shared/rulesets/unloadingV1";

describe("UNLOADING_RULESET_V1", () => {
  it("parses and satisfies invariants", () => {
    expect(() => unloadingRulesetSchema.parse(UNLOADING_RULESET_V1)).not.toThrow();
    expect(() => assertUnloadingRulesetInvariants(UNLOADING_RULESET_V1)).not.toThrow();
    expect(UNLOADING_RULESET_V1.rulesetVersion).toBe(UNLOADING_RULESET_VERSION);
    expect(UNLOADING_RULESET_V1.stageId).toBe("unloading");
  });

  it("uses directive category weights", () => {
    const { weights } = UNLOADING_RULESET_V1;
    expect(weights.handlingQuality).toBeCloseTo(0.3);
    expect(weights.landingPrecision).toBeCloseTo(0.25);
    expect(weights.swayControl).toBeCloseTo(0.2);
    expect(weights.equipmentCare).toBeCloseTo(0.15);
    expect(weights.operationEfficiency).toBeCloseTo(0.1);
  });

  it("matches directive letter grade floors", () => {
    const byGrade = Object.fromEntries(
      UNLOADING_RULESET_V1.gradeBands.map((b) => [b.grade, b.minOverall]),
    );
    expect(byGrade["S+"]).toBe(97);
    expect(byGrade.S).toBe(92);
    expect(byGrade.A).toBe(82);
    expect(byGrade.B).toBe(70);
    expect(byGrade.C).toBe(55);
    expect(byGrade.D).toBe(40);
    expect(byGrade.E).toBe(0);
  });

  it("labels every category in Japanese", () => {
    for (const id of SCORE_CATEGORY_IDS) {
      expect(SCORE_CATEGORY_LABELS_JA[id].length).toBeGreaterThan(0);
    }
  });

  it("rejects weight sums that are not 1", () => {
    const bad = {
      ...UNLOADING_RULESET_V1,
      weights: {
        ...UNLOADING_RULESET_V1.weights,
        handlingQuality: 0.5,
      },
    };
    expect(() => assertUnloadingRulesetInvariants(bad)).toThrow(/weights/);
  });

  it("rejects inverted lower-is-better thresholds", () => {
    expect(() =>
      unloadingRulesetSchema.parse({
        ...UNLOADING_RULESET_V1,
        thresholds: {
          ...UNLOADING_RULESET_V1.thresholds,
          swayControl: {
            maximumSway: { good: 5, bad: 1 },
            integratedSway: UNLOADING_RULESET_V1.thresholds.swayControl.integratedSway,
          },
        },
      }),
    ).toThrow();
  });
});
