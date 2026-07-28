import { describe, expect, it } from "vitest";
import { sampleWind } from "@/game/unloading/windField";
import {
  DEFAULT_WIND_ENVIRONMENT_CONFIG,
  type WindEnvironmentConfig,
} from "@/game/unloading/windEnvironmentConfig";

describe("sampleWind", () => {
  it("is deterministic for seed + time", () => {
    const a = sampleWind("berth", 4.5);
    const b = sampleWind("berth", 4.5);
    expect(a).toEqual(b);
  });

  it("changes over time", () => {
    const a = sampleWind("berth", 0);
    const b = sampleWind("berth", 8);
    expect(a.forceX === b.forceX && a.unit === b.unit).toBe(false);
  });

  it("respects maxForceAbs clamp", () => {
    const tight: WindEnvironmentConfig = {
      ...DEFAULT_WIND_ENVIRONMENT_CONFIG,
      baseForce: 100,
      variation: 1,
      maxForceAbs: 50,
    };
    for (let i = 0; i < 40; i += 1) {
      const w = sampleWind("clamp", i * 0.7, tight);
      expect(Math.abs(w.forceX)).toBeLessThanOrEqual(50 + 1e-9);
      expect(w.windHint).toBeGreaterThanOrEqual(-1);
      expect(w.windHint).toBeLessThanOrEqual(1);
    }
  });

  it("keeps mean direction for moderate variation", () => {
    const config: WindEnvironmentConfig = {
      ...DEFAULT_WIND_ENVIRONMENT_CONFIG,
      baseForce: 40,
      baseDirectionX: -1,
      variation: 0.5,
      maxForceAbs: 100,
      jitterMix: 0,
    };
    let negativeCount = 0;
    for (let i = 0; i < 50; i += 1) {
      if (sampleWind("dir", i * 0.5, config).forceX < 0) {
        negativeCount += 1;
      }
    }
    // variation 0.5 ⇒ scale in [0.5, 1.5], always same sign as baseDirectionX.
    expect(negativeCount).toBe(50);
  });

  it("applies vertical coupling from |forceX|", () => {
    const config: WindEnvironmentConfig = {
      ...DEFAULT_WIND_ENVIRONMENT_CONFIG,
      baseForce: 40,
      variation: 0,
      noiseSpeed: 0,
      jitterMix: 0,
      verticalCoupling: 0.1,
      maxForceAbs: 100,
    };
    const w = sampleWind("vert", 0, config);
    expect(w.forceX).toBeCloseTo(40 * config.baseDirectionX, 5);
    expect(w.forceY).toBeCloseTo(Math.abs(w.forceX) * 0.1, 5);
  });

  it("unit stays in [0, 1]", () => {
    for (let i = 0; i < 30; i += 1) {
      const w = sampleWind("unit", i * 0.33);
      expect(w.unit).toBeGreaterThanOrEqual(0);
      expect(w.unit).toBeLessThanOrEqual(1);
    }
  });
});
