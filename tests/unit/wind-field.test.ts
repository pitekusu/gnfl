import { describe, expect, it } from "vitest";
import { sampleWind, sampleWindDirection } from "@/game/unloading/windField";
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
    const b = sampleWind("berth", 12);
    expect(a.forceX === b.forceX && a.direction === b.direction).toBe(false);
  });

  it("respects maxForceAbs clamp", () => {
    const tight: WindEnvironmentConfig = {
      ...DEFAULT_WIND_ENVIRONMENT_CONFIG,
      baseForce: 200,
      maxForceAbs: 50,
    };
    for (let i = 0; i < 40; i += 1) {
      const w = sampleWind("clamp", i * 0.7, tight);
      expect(Math.abs(w.forceX)).toBeLessThanOrEqual(50 + 1e-9);
    }
  });

  it("blows both left and right over time with zero direction bias", () => {
    const config: WindEnvironmentConfig = {
      ...DEFAULT_WIND_ENVIRONMENT_CONFIG,
      directionBias: 0,
      directionSpeed: 0.25,
    };
    let sawNeg = false;
    let sawPos = false;
    for (let i = 0; i < 500; i += 1) {
      const fx = sampleWind("flip", i * 0.2, config).forceX;
      if (fx < 0) {
        sawNeg = true;
      }
      if (fx > 0) {
        sawPos = true;
      }
    }
    expect(sawNeg).toBe(true);
    expect(sawPos).toBe(true);
  });

  it("keeps |forceX| at least minForceFraction * baseForce (away from blends)", () => {
    const config = DEFAULT_WIND_ENVIRONMENT_CONFIG;
    const minAbs = config.baseForce * config.minForceFraction * 0.95;
    let lowCount = 0;
    for (let i = 0; i < 200; i += 1) {
      // Sample mid-cell to avoid direction blend edge.
      const t = (i + 0.4) / config.directionSpeed;
      const w = sampleWind("mag", t, config);
      if (Math.abs(w.forceX) + 1e-6 < minAbs) {
        lowCount += 1;
      }
    }
    expect(lowCount).toBe(0);
  });

  it("locks direction when directionBias is 1", () => {
    const config: WindEnvironmentConfig = {
      ...DEFAULT_WIND_ENVIRONMENT_CONFIG,
      baseDirectionX: -1,
      directionBias: 1,
    };
    for (let i = 0; i < 40; i += 1) {
      expect(sampleWindDirection("fixed", i * 0.5, config)).toBe(-1);
      expect(sampleWind("fixed", i * 0.5, config).forceX).toBeLessThan(0);
    }
  });

  it("applies vertical coupling from |forceX|", () => {
    const config: WindEnvironmentConfig = {
      ...DEFAULT_WIND_ENVIRONMENT_CONFIG,
      directionBias: 1,
      baseDirectionX: 1,
      magnitudeSpeed: 0,
      jitterMix: 0,
      verticalCoupling: 0.1,
    };
    const w = sampleWind("vert", 1.2, config);
    expect(w.forceX).toBeGreaterThan(0);
    expect(w.forceY).toBeCloseTo(Math.abs(w.forceX) * 0.1, 5);
  });
});
