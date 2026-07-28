import { describe, expect, it } from "vitest";
import { sampleSignedDriver, sampleWind } from "@/game/unloading/windField";
import {
  DEFAULT_WIND_ENVIRONMENT_CONFIG,
  type WindEnvironmentConfig,
} from "@/game/unloading/windEnvironmentConfig";

describe("sampleWind", () => {
  it("is deterministic for seed + time", () => {
    expect(sampleWind("berth", 4.5)).toEqual(sampleWind("berth", 4.5));
  });

  it("changes over time", () => {
    expect(sampleWind("berth", 0).forceX).not.toBe(sampleWind("berth", 2.5).forceX);
  });

  it("respects maxForceAbs", () => {
    const tight: WindEnvironmentConfig = {
      ...DEFAULT_WIND_ENVIRONMENT_CONFIG,
      baseForce: 200,
      maxForceAbs: 35,
      lockedBaseForce: 200,
      lockedMaxForceAbs: 35,
    };
    for (let i = 0; i < 40; i += 1) {
      expect(Math.abs(sampleWind("c", i * 0.3, tight).forceX)).toBeLessThanOrEqual(
        35 + 1e-9,
      );
    }
  });

  it("spends substantial time both left and right", () => {
    let neg = 0;
    let pos = 0;
    for (let i = 0; i < 400; i += 1) {
      const fx = sampleWind("phase2-greybox", i * 0.05).forceX;
      if (fx < 0) {
        neg += 1;
      }
      if (fx > 0) {
        pos += 1;
      }
    }
    // Sine-led driver: both sides should appear often (not 90/10).
    expect(neg).toBeGreaterThan(100);
    expect(pos).toBeGreaterThan(100);
    expect(Math.abs(neg - pos)).toBeLessThan(220);
  });

  it("reverses many times (not stuck on one side)", () => {
    let flips = 0;
    let prev = Math.sign(sampleWind("phase2-greybox", 0).forceX);
    for (let i = 1; i < 500; i += 1) {
      const s = Math.sign(sampleWind("phase2-greybox", i * 0.05).forceX);
      if (s !== 0 && prev !== 0 && s !== prev) {
        flips += 1;
      }
      if (s !== 0) {
        prev = s;
      }
    }
    // ~0.35 Hz sine ⇒ many half-cycles in 25s of samples.
    expect(flips).toBeGreaterThan(10);
  });

  it("can lean one way when directionBias is high", () => {
    const config: WindEnvironmentConfig = {
      ...DEFAULT_WIND_ENVIRONMENT_CONFIG,
      directionBias: 0.35,
      baseDirectionX: -1,
      oscWeight: 0.3,
    };
    let neg = 0;
    for (let i = 0; i < 200; i += 1) {
      if (sampleSignedDriver("lean", i * 0.1, config) < 0) {
        neg += 1;
      }
    }
    expect(neg).toBeGreaterThan(110);
  });

  it("applies vertical coupling from |forceX|", () => {
    const w = sampleWind("vert", 1.0, {
      ...DEFAULT_WIND_ENVIRONMENT_CONFIG,
      verticalCoupling: 0.1,
    });
    expect(w.forceY).toBeCloseTo(Math.abs(w.forceX) * 0.1, 5);
  });
});
