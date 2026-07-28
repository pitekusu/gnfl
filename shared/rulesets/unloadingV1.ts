import { z } from "zod";

/**
 * Scoring ruleset `unloading-v1`.
 * Thresholds are greybox defaults (game units) — Phase 9 rebalances feel.
 * Changing thresholds must bump {@link UNLOADING_RULESET_VERSION}.
 */

export const UNLOADING_RULESET_VERSION = "unloading-v1" as const;
export const UNLOADING_STAGE_ID = "unloading" as const;

export const SCORE_CATEGORY_IDS = [
  "handlingQuality",
  "landingPrecision",
  "swayControl",
  "equipmentCare",
  "operationEfficiency",
] as const;

export type ScoreCategoryId = (typeof SCORE_CATEGORY_IDS)[number];

/** Overall (0–100) letter bands from the implementation directive §11.4. */
export const LETTER_GRADES = ["S+", "S", "A", "B", "C", "D", "E"] as const;
export type LetterGrade = (typeof LETTER_GRADES)[number];

/** Japanese labels for the result screen (category enum stays English in code). */
export const SCORE_CATEGORY_LABELS_JA: Record<ScoreCategoryId, string> = {
  handlingQuality: "取扱品質",
  landingPrecision: "着座精度",
  swayControl: "振れ制御",
  equipmentCare: "設備負荷",
  operationEfficiency: "操作効率",
};

/**
 * Lower metric ⇒ higher category score.
 * Linear map: metric <= good → 100; metric >= bad → 0; interpolate between.
 */
export const lowerIsBetterThresholdSchema = z
  .object({
    good: z.number().finite().nonnegative(),
    bad: z.number().finite().positive(),
  })
  .refine((t) => t.good < t.bad, {
    message: "lower-is-better threshold requires good < bad",
  });

export type LowerIsBetterThreshold = z.infer<typeof lowerIsBetterThresholdSchema>;

export const letterGradeBandSchema = z.object({
  grade: z.enum(LETTER_GRADES),
  /** Minimum overall category blend in 0–100 for this grade (inclusive). */
  minOverall: z.number().min(0).max(100),
});

export type LetterGradeBand = z.infer<typeof letterGradeBandSchema>;

export const unloadingRulesetSchema = z.object({
  rulesetVersion: z.literal(UNLOADING_RULESET_VERSION),
  stageId: z.literal(UNLOADING_STAGE_ID),
  /**
   * Category weights (must sum to 1). Directive §11.3.
   */
  weights: z.object({
    handlingQuality: z.number().positive().max(1),
    landingPrecision: z.number().positive().max(1),
    swayControl: z.number().positive().max(1),
    equipmentCare: z.number().positive().max(1),
    operationEfficiency: z.number().positive().max(1),
  }),
  /**
   * Grade bands ordered best→worst; first match where overall >= minOverall wins.
   * E uses minOverall 0 as the catch-all.
   */
  gradeBands: z.array(letterGradeBandSchema).min(1),
  /**
   * Cable load above this (game units) increments `highCableLoadTicks` while collecting.
   */
  highCableLoadThreshold: z.number().positive(),
  /**
   * Per-metric continua for category scorers (all lower-is-better).
   * Multiple metrics in a category are averaged in C4.
   */
  thresholds: z.object({
    handlingQuality: z.object({
      maximumCaskAcceleration: lowerIsBetterThresholdSchema,
      collisionImpulse: lowerIsBetterThresholdSchema,
      collisionCount: lowerIsBetterThresholdSchema,
    }),
    landingPrecision: z.object({
      landingPositionError: lowerIsBetterThresholdSchema,
      landingAngleError: lowerIsBetterThresholdSchema,
      landingVerticalSpeed: lowerIsBetterThresholdSchema,
      landingHorizontalSpeed: lowerIsBetterThresholdSchema,
    }),
    swayControl: z.object({
      maximumSway: lowerIsBetterThresholdSchema,
      integratedSway: lowerIsBetterThresholdSchema,
    }),
    equipmentCare: z.object({
      maximumCableLoad: lowerIsBetterThresholdSchema,
      highCableLoadTicks: lowerIsBetterThresholdSchema,
      interlockCount: lowerIsBetterThresholdSchema,
    }),
    operationEfficiency: z.object({
      /** Physics ticks at 120 Hz; lower is better within a soft band. */
      elapsedTicks: lowerIsBetterThresholdSchema,
    }),
  }),
});

export type UnloadingRuleset = z.infer<typeof unloadingRulesetSchema>;

/**
 * Default greybox ruleset. Numbers are intentional starting points for Phase 9 tune.
 * Physics reference: seat errors ~0.7 / 0.2 rad / 0.85 speed; hoist cut ~720 tension.
 */
export const UNLOADING_RULESET_V1: UnloadingRuleset = unloadingRulesetSchema.parse({
  rulesetVersion: UNLOADING_RULESET_VERSION,
  stageId: UNLOADING_STAGE_ID,
  weights: {
    handlingQuality: 0.3,
    landingPrecision: 0.25,
    swayControl: 0.2,
    equipmentCare: 0.15,
    operationEfficiency: 0.1,
  },
  gradeBands: [
    { grade: "S+", minOverall: 97 },
    { grade: "S", minOverall: 92 },
    { grade: "A", minOverall: 82 },
    { grade: "B", minOverall: 70 },
    { grade: "C", minOverall: 55 },
    { grade: "D", minOverall: 40 },
    { grade: "E", minOverall: 0 },
  ],
  highCableLoadThreshold: 420,
  thresholds: {
    handlingQuality: {
      maximumCaskAcceleration: { good: 2.5, bad: 22 },
      collisionImpulse: { good: 0, bad: 40 },
      collisionCount: { good: 0, bad: 4 },
    },
    landingPrecision: {
      landingPositionError: { good: 0.12, bad: 1.1 },
      landingAngleError: { good: 0.04, bad: 0.35 },
      landingVerticalSpeed: { good: 0.12, bad: 1.4 },
      landingHorizontalSpeed: { good: 0.08, bad: 1.0 },
    },
    swayControl: {
      maximumSway: { good: 0.35, bad: 3.5 },
      // Integrated over a careful ~2–3 min run at mild sway.
      integratedSway: { good: 120, bad: 2500 },
    },
    equipmentCare: {
      maximumCableLoad: { good: 180, bad: 720 },
      highCableLoadTicks: { good: 0, bad: 900 },
      interlockCount: { good: 0, bad: 10 },
    },
    operationEfficiency: {
      // 120 Hz: ~75 s good floor, ~5 min soft floor for zero.
      elapsedTicks: { good: 9_000, bad: 36_000 },
    },
  },
});

export function assertUnloadingRulesetInvariants(ruleset: UnloadingRuleset): void {
  const w = ruleset.weights;
  const sum =
    w.handlingQuality +
    w.landingPrecision +
    w.swayControl +
    w.equipmentCare +
    w.operationEfficiency;
  if (Math.abs(sum - 1) > 1e-9) {
    throw new Error(`unloading ruleset weights must sum to 1 (got ${sum})`);
  }

  let prev = 101;
  for (const band of ruleset.gradeBands) {
    if (band.minOverall > prev) {
      throw new Error("grade bands must be non-increasing in minOverall");
    }
    prev = band.minOverall;
  }
  const last = ruleset.gradeBands[ruleset.gradeBands.length - 1];
  if (last === undefined || last.minOverall !== 0) {
    throw new Error("lowest grade band must have minOverall 0");
  }
}

assertUnloadingRulesetInvariants(UNLOADING_RULESET_V1);
