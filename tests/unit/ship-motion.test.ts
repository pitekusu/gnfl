import { describe, expect, it } from "vitest";
import { hashSeedToU32, seedPhase } from "@/game/unloading/seedHash";
import { sampleBaseShipMotion } from "@/game/unloading/shipMotion";

describe("seedHash", () => {
  it("is stable for the same seed", () => {
    expect(hashSeedToU32("alpha")).toBe(hashSeedToU32("alpha"));
    expect(hashSeedToU32("alpha")).not.toBe(hashSeedToU32("beta"));
  });

  it("produces phases in [0, 2π)", () => {
    const phase = seedPhase("dock-1", 0);
    expect(phase).toBeGreaterThanOrEqual(0);
    expect(phase).toBeLessThan(Math.PI * 2);
  });
});

describe("sampleBaseShipMotion", () => {
  const rest = { x: -10, y: 6.2 };

  it("is deterministic for seed + time", () => {
    const a = sampleBaseShipMotion("wave-seed", 3.25, rest);
    const b = sampleBaseShipMotion("wave-seed", 3.25, rest);
    expect(a).toEqual(b);
  });

  it("changes pose over time", () => {
    const a = sampleBaseShipMotion("wave-seed", 0, rest);
    const b = sampleBaseShipMotion("wave-seed", 1.5, rest);
    expect(a.y === b.y && a.angleRad === b.angleRad).toBe(false);
  });

  it("keeps rest x and applies heave to y", () => {
    const pose = sampleBaseShipMotion("wave-seed", 0.8, rest);
    expect(pose.x).toBe(rest.x);
    expect(pose.y).not.toBe(rest.y);
    expect(pose.y).toBeCloseTo(rest.y + pose.heave, 10);
  });

  it("amplifies motion when highWaveEnvelope is set", () => {
    const calm = sampleBaseShipMotion("wave-seed", 1.1, rest, {
      highWaveEnvelope: 0,
    });
    const rough = sampleBaseShipMotion("wave-seed", 1.1, rest, {
      highWaveEnvelope: 1,
    });
    expect(Math.abs(rough.heave)).toBeGreaterThan(Math.abs(calm.heave) - 1e-9);
  });
});
