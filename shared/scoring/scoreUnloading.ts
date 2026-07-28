import type { UnloadingMetrics } from "@shared/contracts/unloadingMetrics";
import {
  SCORE_CATEGORY_IDS,
  UNLOADING_RULESET_V1,
  type LetterGrade,
  type LowerIsBetterThreshold,
  type ScoreCategoryId,
  type UnloadingRuleset,
} from "@shared/rulesets/unloadingV1";

/**
 * Pure unloading scorer (client + future Lambda).
 * Same metrics + ruleset ⇒ same score / grade (no Math.random).
 */

export interface UnloadingCategoryScores {
  handlingQuality: number;
  landingPrecision: number;
  swayControl: number;
  equipmentCare: number;
  operationEfficiency: number;
}

export interface UnloadingScoreResult {
  rulesetVersion: string;
  /** Per-category 0–100. */
  categories: UnloadingCategoryScores;
  /** Weighted blend 0–100 before integer score. */
  overall: number;
  /** Integer 0–100_000. */
  score: number;
  grade: LetterGrade;
  /** Per-category letter grades (same bands as overall). */
  categoryGrades: Record<ScoreCategoryId, LetterGrade>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Linear map for lower-is-better metrics.
 * metric <= good → 100; metric >= bad → 0.
 */
export function scoreLowerIsBetter(
  metric: number,
  threshold: LowerIsBetterThreshold,
): number {
  if (!Number.isFinite(metric)) {
    return 0;
  }
  if (metric <= threshold.good) {
    return 100;
  }
  if (metric >= threshold.bad) {
    return 0;
  }
  const t = (metric - threshold.good) / (threshold.bad - threshold.good);
  return clamp(100 * (1 - t), 0, 100);
}

function average(scores: ReadonlyArray<number>): number {
  if (scores.length === 0) {
    return 0;
  }
  let sum = 0;
  for (const s of scores) {
    sum += s;
  }
  return sum / scores.length;
}

export function scoreHandlingQuality(
  metrics: UnloadingMetrics,
  ruleset: UnloadingRuleset = UNLOADING_RULESET_V1,
): number {
  const t = ruleset.thresholds.handlingQuality;
  return average([
    scoreLowerIsBetter(metrics.maximumCaskAcceleration, t.maximumCaskAcceleration),
    scoreLowerIsBetter(metrics.collisionImpulse, t.collisionImpulse),
    scoreLowerIsBetter(metrics.collisionCount, t.collisionCount),
  ]);
}

export function scoreLandingPrecision(
  metrics: UnloadingMetrics,
  ruleset: UnloadingRuleset = UNLOADING_RULESET_V1,
): number {
  const t = ruleset.thresholds.landingPrecision;
  return average([
    scoreLowerIsBetter(metrics.landingPositionError, t.landingPositionError),
    scoreLowerIsBetter(metrics.landingAngleError, t.landingAngleError),
    scoreLowerIsBetter(metrics.landingVerticalSpeed, t.landingVerticalSpeed),
    scoreLowerIsBetter(metrics.landingHorizontalSpeed, t.landingHorizontalSpeed),
  ]);
}

export function scoreSwayControl(
  metrics: UnloadingMetrics,
  ruleset: UnloadingRuleset = UNLOADING_RULESET_V1,
): number {
  const t = ruleset.thresholds.swayControl;
  return average([
    scoreLowerIsBetter(metrics.maximumSway, t.maximumSway),
    scoreLowerIsBetter(metrics.integratedSway, t.integratedSway),
  ]);
}

export function scoreEquipmentCare(
  metrics: UnloadingMetrics,
  ruleset: UnloadingRuleset = UNLOADING_RULESET_V1,
): number {
  const t = ruleset.thresholds.equipmentCare;
  return average([
    scoreLowerIsBetter(metrics.maximumCableLoad, t.maximumCableLoad),
    scoreLowerIsBetter(metrics.highCableLoadTicks, t.highCableLoadTicks),
    scoreLowerIsBetter(metrics.interlockCount, t.interlockCount),
  ]);
}

export function scoreOperationEfficiency(
  metrics: UnloadingMetrics,
  ruleset: UnloadingRuleset = UNLOADING_RULESET_V1,
): number {
  const t = ruleset.thresholds.operationEfficiency;
  return scoreLowerIsBetter(metrics.elapsedTicks, t.elapsedTicks);
}

export function scoreAllCategories(
  metrics: UnloadingMetrics,
  ruleset: UnloadingRuleset = UNLOADING_RULESET_V1,
): UnloadingCategoryScores {
  return {
    handlingQuality: scoreHandlingQuality(metrics, ruleset),
    landingPrecision: scoreLandingPrecision(metrics, ruleset),
    swayControl: scoreSwayControl(metrics, ruleset),
    equipmentCare: scoreEquipmentCare(metrics, ruleset),
    operationEfficiency: scoreOperationEfficiency(metrics, ruleset),
  };
}

/** Map overall (0–100) to letter grade using ruleset bands (best first). */
export function gradeFromOverall(
  overall: number,
  ruleset: UnloadingRuleset = UNLOADING_RULESET_V1,
): LetterGrade {
  const value = clamp(overall, 0, 100);
  for (const band of ruleset.gradeBands) {
    if (value >= band.minOverall) {
      return band.grade;
    }
  }
  return "E";
}

export function blendOverall(
  categories: UnloadingCategoryScores,
  ruleset: UnloadingRuleset = UNLOADING_RULESET_V1,
): number {
  const w = ruleset.weights;
  const overall =
    categories.handlingQuality * w.handlingQuality +
    categories.landingPrecision * w.landingPrecision +
    categories.swayControl * w.swayControl +
    categories.equipmentCare * w.equipmentCare +
    categories.operationEfficiency * w.operationEfficiency;
  return clamp(overall, 0, 100);
}

/** Integer score 0–100_000 from overall 0–100. */
export function overallToScore(overall: number): number {
  return Math.round(clamp(overall, 0, 100) * 1000);
}

/**
 * Full scoring pipeline for a completed unloading run.
 * Callers must not invoke this for SAFE_ABORTED if they need a submitable grade.
 */
export function scoreUnloading(
  metrics: UnloadingMetrics,
  ruleset: UnloadingRuleset = UNLOADING_RULESET_V1,
): UnloadingScoreResult {
  const categories = scoreAllCategories(metrics, ruleset);
  const overall = blendOverall(categories, ruleset);
  const score = overallToScore(overall);
  const grade = gradeFromOverall(overall, ruleset);
  const categoryGrades = {} as Record<ScoreCategoryId, LetterGrade>;
  for (const id of SCORE_CATEGORY_IDS) {
    categoryGrades[id] = gradeFromOverall(categories[id], ruleset);
  }
  return {
    rulesetVersion: ruleset.rulesetVersion,
    categories,
    overall,
    score,
    grade,
    categoryGrades,
  };
}
