import { describe, expect, it } from "vitest";
import {
  sampleSeededFbm1D,
  sampleSeededNoise1D,
  sampleSeededUnitNoise1D,
  seedRange,
  seedUnit,
} from "@/game/unloading/seededNoise";

describe("seedUnit / seedRange", () => {
  it("is deterministic for the same seed and lane", () => {
    expect(seedUnit("dock", 0)).toBe(seedUnit("dock", 0));
    expect(seedUnit("dock", 0)).not.toBe(seedUnit("dock", 1));
    expect(seedUnit("dock", 0)).not.toBe(seedUnit("pier", 0));
  });

  it("returns values in [0, 1)", () => {
    for (let lane = 0; lane < 40; lane += 1) {
      const u = seedUnit("range-check", lane);
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
    }
  });

  it("maps into the requested range", () => {
    for (let lane = 0; lane < 20; lane += 1) {
      const v = seedRange("span", lane, 2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThan(5);
    }
  });
});

describe("sampleSeededNoise1D", () => {
  it("is deterministic for seed + lane + time", () => {
    const a = sampleSeededNoise1D("sea", 3, 12.5);
    const b = sampleSeededNoise1D("sea", 3, 12.5);
    expect(a).toBe(b);
  });

  it("stays roughly in [-1, 1]", () => {
    for (let i = 0; i < 200; i += 1) {
      const t = i * 0.37;
      const v = sampleSeededNoise1D("bound", 1, t);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("changes over time and across lanes", () => {
    const a = sampleSeededNoise1D("sea", 0, 0);
    const b = sampleSeededNoise1D("sea", 0, 2.5);
    const c = sampleSeededNoise1D("sea", 1, 0);
    expect(a === b && a === c).toBe(false);
  });

  it("varies smoothly for small time steps", () => {
    const t0 = 4.2;
    const dt = 1 / 120;
    const a = sampleSeededNoise1D("smooth", 2, t0);
    const b = sampleSeededNoise1D("smooth", 2, t0 + dt);
    // At 120 Hz, lattice noise should not jump by a large fraction of the range.
    expect(Math.abs(b - a)).toBeLessThan(0.15);
  });
});

describe("sampleSeededUnitNoise1D / fbm", () => {
  it("unit noise is in [0, 1]", () => {
    for (let i = 0; i < 50; i += 1) {
      const v = sampleSeededUnitNoise1D("u", 0, i * 0.5);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("fbm is deterministic and finite", () => {
    const a = sampleSeededFbm1D("fbm", 0, 3.1, 3);
    const b = sampleSeededFbm1D("fbm", 0, 3.1, 3);
    expect(a).toBe(b);
    expect(Number.isFinite(a)).toBe(true);
    expect(Math.abs(a)).toBeLessThanOrEqual(1.0001);
  });
});
