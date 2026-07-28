import { describe, expect, it } from "vitest";
import {
  accumulateUnloadingLanding,
  accumulateUnloadingMetricsTick,
  createEmptyUnloadingMetrics,
} from "@shared/scoring/accumulateUnloadingMetrics";
import { UNLOADING_RULESET_V1 } from "@shared/rulesets/unloadingV1";

describe("accumulateUnloadingMetricsTick", () => {
  it("starts from zeros and counts elapsed ticks", () => {
    let m = createEmptyUnloadingMetrics();
    m = accumulateUnloadingMetricsTick(m, {
      sway: 0.5,
      cableLoad: 10,
      caskAcceleration: 1,
    });
    m = accumulateUnloadingMetricsTick(m, {
      sway: 0.2,
      cableLoad: 12,
      caskAcceleration: 0.5,
    });
    expect(m.elapsedTicks).toBe(2);
    expect(m.maximumSway).toBe(0.5);
    expect(m.integratedSway).toBeCloseTo(0.7);
    expect(m.maximumCableLoad).toBe(12);
    expect(m.maximumCaskAcceleration).toBe(1);
  });

  it("increments highCableLoadTicks only above threshold", () => {
    const thr = UNLOADING_RULESET_V1.highCableLoadThreshold;
    let m = createEmptyUnloadingMetrics();
    m = accumulateUnloadingMetricsTick(m, {
      sway: 0,
      cableLoad: thr,
      caskAcceleration: 0,
    });
    expect(m.highCableLoadTicks).toBe(0);
    m = accumulateUnloadingMetricsTick(m, {
      sway: 0,
      cableLoad: thr + 1,
      caskAcceleration: 0,
    });
    expect(m.highCableLoadTicks).toBe(1);
  });

  it("records collisions and interlocks", () => {
    let m = createEmptyUnloadingMetrics();
    m = accumulateUnloadingMetricsTick(m, {
      sway: 0,
      cableLoad: 0,
      caskAcceleration: 0,
      collisionImpulseDelta: 3.5,
      interlockTripped: true,
    });
    expect(m.collisionCount).toBe(1);
    expect(m.collisionImpulse).toBeCloseTo(3.5);
    expect(m.interlockCount).toBe(1);
  });

  it("does not mutate the previous object", () => {
    const prev = createEmptyUnloadingMetrics();
    const next = accumulateUnloadingMetricsTick(prev, {
      sway: 1,
      cableLoad: 2,
      caskAcceleration: 3,
    });
    expect(prev.elapsedTicks).toBe(0);
    expect(next.elapsedTicks).toBe(1);
    expect(next).not.toBe(prev);
  });

  it("treats non-finite sample values as zero", () => {
    const m = accumulateUnloadingMetricsTick(createEmptyUnloadingMetrics(), {
      sway: Number.NaN,
      cableLoad: Number.POSITIVE_INFINITY,
      caskAcceleration: -5,
    });
    expect(m.maximumSway).toBe(0);
    expect(m.maximumCableLoad).toBe(0);
    expect(m.maximumCaskAcceleration).toBe(0);
    expect(m.elapsedTicks).toBe(1);
  });
});

describe("accumulateUnloadingLanding", () => {
  it("stores landing snapshot magnitudes", () => {
    const m = accumulateUnloadingLanding(createEmptyUnloadingMetrics(), {
      positionError: 0.4,
      angleError: 0.1,
      verticalSpeed: 0.2,
      horizontalSpeed: 0.05,
    });
    expect(m.landingPositionError).toBe(0.4);
    expect(m.landingAngleError).toBe(0.1);
    expect(m.landingVerticalSpeed).toBe(0.2);
    expect(m.landingHorizontalSpeed).toBe(0.05);
  });

  it("keeps the worse (max) landing values across updates", () => {
    let m = accumulateUnloadingLanding(createEmptyUnloadingMetrics(), {
      positionError: 0.3,
      angleError: 0.2,
      verticalSpeed: 0.5,
      horizontalSpeed: 0.1,
    });
    m = accumulateUnloadingLanding(m, {
      positionError: 0.1,
      angleError: 0.25,
      verticalSpeed: 0.2,
      horizontalSpeed: 0.4,
    });
    expect(m.landingPositionError).toBe(0.3);
    expect(m.landingAngleError).toBe(0.25);
    expect(m.landingVerticalSpeed).toBe(0.5);
    expect(m.landingHorizontalSpeed).toBe(0.4);
  });
});
