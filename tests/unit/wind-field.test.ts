import { describe, expect, it } from "vitest";
import { sampleSignedDriver, sampleWind } from "@/game/unloading/windField";
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
    const b = sampleWind("berth", 3);
    expect(a.forceX === b.forceX).toBe(false);
  });

  it("respects maxForceAbs clamp", () => {
    const tight: WindEnvironmentConfig = {
      ...DEFAULT_WIND_ENVIRONMENT_CONFIG,
      baseForce: 200,
      maxForceAbs: 40,
    };
    for (let i = 0; i < 40; i += 1) {
      const w = sampleWind("clamp", i * 0.4, tight);
      expect(Math.abs(w.forceX)).toBeLessThanOrEqual(40 + 1e-9);
    }
  });

  it("spends time both left and right with low direction bias", () => {
    const config: WindEnvironmentConfig = {
      ...DEFAULT_WIND_ENVIRONMENT_CONFIG,
      directionBias: 0,
    };
    let neg = 0;
    let pos = 0;
    for (let i = 0; i < 600; i += 1) {
      const fx = sampleWind("both", i * 0.15, config).forceX;
      if (fx < 0) {
        neg += 1;
      }
      if (fx > 0) {
        pos += 1;
      }
    }
    expect(neg).toBeGreaterThan(80);
    expect(pos).toBeGreaterThan(80);
  });

  it("keeps |force| from collapsing to near-zero most of the time", () => {
    const minAbs =
      DEFAULT_WIND_ENVIRONMENT_CONFIG.baseForce *
      DEFAULT_WIND_ENVIRONMENT_CONFIG.minSignedAbs *
      0.9;
    let ok = 0;
    for (let i = 0; i < 200; i += 1) {
      if (Math.abs(sampleWind("mag", i * 0.2).forceX) >= minAbs) {
        ok += 1;
      }
    }
    expect(ok).toBeGreaterThan(160);
  });

  it("locks lean when directionBias is 1", () => {
    const config: WindEnvironmentConfig = {
      ...DEFAULT_WIND_ENVIRONMENT_CONFIG,
      baseDirectionX: -1,
      directionBias: 1,
    };
    for (let i = 0; i < 30; i += 1) {
      expect(sampleSignedDriver("bias", i * 0.3, config)).toBeLessThan(0);
      expect(sampleWind("bias", i * 0.3, config).forceX).toBeLessThan(0);
    }
  });

  it("applies vertical coupling from |forceX|", () => {
    const config: WindEnvironmentConfig = {
      ...DEFAULT_WIND_ENVIRONMENT_CONFIG,
      directionBias: 1,
      baseDirectionX: 1,
      verticalCoupling: 0.1,
    };
    const w = sampleWind("vert", 2.5, config);
    expect(w.forceX).toBeGreaterThan(0);
    expect(w.forceY).toBeCloseTo(Math.abs(w.forceX) * 0.1, 5);
  });
});
