import { describe, expect, it } from "vitest";
import { hashSeedToU32, seedPhase } from "@/game/unloading/seedHash";
import {
  sampleBaseShipMotion,
  sampleWaveEnvelopeScale,
} from "@/game/unloading/shipMotion";
import {
  DEFAULT_WAVE_ENVIRONMENT_CONFIG,
  type WaveEnvironmentConfig,
} from "@/game/unloading/waveEnvironmentConfig";

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

describe("sampleWaveEnvelopeScale", () => {
  it("is deterministic and within config min/max", () => {
    const a = sampleWaveEnvelopeScale("env", 10);
    const b = sampleWaveEnvelopeScale("env", 10);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(DEFAULT_WAVE_ENVIRONMENT_CONFIG.envelope.minScale);
    expect(a).toBeLessThanOrEqual(DEFAULT_WAVE_ENVIRONMENT_CONFIG.envelope.maxScale);
  });

  it("varies over long time spans", () => {
    const samples = [0, 20, 40, 60, 80].map((t) => sampleWaveEnvelopeScale("env", t));
    const unique = new Set(samples.map((v) => v.toFixed(4)));
    expect(unique.size).toBeGreaterThan(1);
  });
});

describe("sampleBaseShipMotion", () => {
  const rest = { x: -10, y: 6.2 };

  /** Legacy Phase 2/3 hard-coded peak heave sum (before envelope). */
  const legacyHeavePeak = 0.16 + 0.06 + 0.03;

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

  it("produces larger heave peaks than the legacy Phase 2/3 sum", () => {
    let maxAbs = 0;
    for (let i = 0; i < 400; i += 1) {
      const pose = sampleBaseShipMotion("wave-seed", i * 0.05, rest);
      maxAbs = Math.max(maxAbs, Math.abs(pose.heave));
    }
    // Defaults are ~2.8× harmonic sum and envelope ≥ 0.65 → well above legacy peak.
    expect(maxAbs).toBeGreaterThan(legacyHeavePeak * 1.5);
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

  it("respects a calmer wave config", () => {
    const calmWave: WaveEnvironmentConfig = {
      ...DEFAULT_WAVE_ENVIRONMENT_CONFIG,
      heave: {
        frequencies: DEFAULT_WAVE_ENVIRONMENT_CONFIG.heave.frequencies,
        amplitudes: [0.05, 0.02, 0.01],
      },
      envelope: {
        minScale: 1,
        maxScale: 1,
        noiseSpeed: 0,
        noiseLane: 0,
      },
    };
    let maxAbs = 0;
    for (let i = 0; i < 200; i += 1) {
      const pose = sampleBaseShipMotion("wave-seed", i * 0.05, rest, {
        wave: calmWave,
      });
      maxAbs = Math.max(maxAbs, Math.abs(pose.heave));
    }
    expect(maxAbs).toBeLessThanOrEqual(0.05 + 0.02 + 0.01 + 1e-9);
  });
});
