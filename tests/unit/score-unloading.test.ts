import { describe, expect, it } from "vitest";
import { createZeroUnloadingMetrics } from "@shared/contracts/unloadingMetrics";
import {
  blendOverall,
  gradeFromOverall,
  overallToScore,
  scoreLowerIsBetter,
  scoreUnloading,
} from "@shared/scoring/scoreUnloading";
import type { UnloadingMetrics } from "@shared/contracts/unloadingMetrics";

function carefulMetrics(): UnloadingMetrics {
  return {
    ...createZeroUnloadingMetrics(),
    maximumSway: 0.2,
    integratedSway: 90,
    maximumCableLoad: 150,
    highCableLoadTicks: 0,
    maximumCaskAcceleration: 1.5,
    collisionImpulse: 0,
    collisionCount: 0,
    landingPositionError: 0.08,
    landingAngleError: 0.03,
    landingVerticalSpeed: 0.1,
    landingHorizontalSpeed: 0.05,
    interlockCount: 0,
    elapsedTicks: 10_000,
  };
}

function sloppyMetrics(): UnloadingMetrics {
  return {
    ...createZeroUnloadingMetrics(),
    maximumSway: 3.2,
    integratedSway: 2200,
    maximumCableLoad: 680,
    highCableLoadTicks: 800,
    maximumCaskAcceleration: 18,
    collisionImpulse: 30,
    collisionCount: 3,
    landingPositionError: 0.95,
    landingAngleError: 0.3,
    landingVerticalSpeed: 1.2,
    landingHorizontalSpeed: 0.85,
    interlockCount: 7,
    elapsedTicks: 30_000,
  };
}

describe("scoreLowerIsBetter", () => {
  it("is 100 at or below good, 0 at or above bad", () => {
    const t = { good: 1, bad: 3 };
    expect(scoreLowerIsBetter(0.5, t)).toBe(100);
    expect(scoreLowerIsBetter(1, t)).toBe(100);
    expect(scoreLowerIsBetter(3, t)).toBe(0);
    expect(scoreLowerIsBetter(4, t)).toBe(0);
  });

  it("interpolates between good and bad", () => {
    const t = { good: 0, bad: 10 };
    expect(scoreLowerIsBetter(5, t)).toBeCloseTo(50);
  });
});

describe("gradeFromOverall / overallToScore", () => {
  it("maps directive bands", () => {
    expect(gradeFromOverall(97)).toBe("S+");
    expect(gradeFromOverall(96.9)).toBe("S");
    expect(gradeFromOverall(92)).toBe("S");
    expect(gradeFromOverall(82)).toBe("A");
    expect(gradeFromOverall(70)).toBe("B");
    expect(gradeFromOverall(55)).toBe("C");
    expect(gradeFromOverall(40)).toBe("D");
    expect(gradeFromOverall(39.9)).toBe("E");
  });

  it("converts overall to integer 0–100000", () => {
    expect(overallToScore(87.32)).toBe(87320);
    expect(overallToScore(0)).toBe(0);
    expect(overallToScore(100)).toBe(100_000);
  });
});

describe("scoreUnloading", () => {
  it("is deterministic for the same metrics", () => {
    const m = carefulMetrics();
    expect(scoreUnloading(m)).toEqual(scoreUnloading(m));
  });

  it("scores careful play higher than sloppy play", () => {
    const careful = scoreUnloading(carefulMetrics());
    const sloppy = scoreUnloading(sloppyMetrics());
    expect(careful.score).toBeGreaterThan(sloppy.score);
    expect(careful.overall).toBeGreaterThan(sloppy.overall);
    expect(careful.grade).not.toBe("E");
    expect(sloppy.overall).toBeLessThan(70);
  });

  it("near-perfect zeros yield top overall", () => {
    const perfect = scoreUnloading(createZeroUnloadingMetrics());
    // elapsedTicks 0 is at/below good → efficiency 100; other zeros are best.
    expect(perfect.overall).toBeCloseTo(100);
    expect(perfect.score).toBe(100_000);
    expect(perfect.grade).toBe("S+");
    expect(perfect.rulesetVersion).toBe("unloading-v1");
  });

  it("weighted blend matches directive formula", () => {
    const categories = {
      handlingQuality: 100,
      landingPrecision: 80,
      swayControl: 60,
      equipmentCare: 40,
      operationEfficiency: 20,
    };
    const overall = blendOverall(categories);
    expect(overall).toBeCloseTo(
      100 * 0.3 + 80 * 0.25 + 60 * 0.2 + 40 * 0.15 + 20 * 0.1,
    );
  });

  it("assigns per-category letter grades", () => {
    const result = scoreUnloading(carefulMetrics());
    expect(result.categoryGrades.handlingQuality).toMatch(/^[SABCDE]\+?$/);
    expect(result.categoryGrades.swayControl).toBeDefined();
  });
});
