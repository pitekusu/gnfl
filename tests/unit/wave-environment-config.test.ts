import { describe, expect, it } from "vitest";
import {
  DEFAULT_WAVE_ENVIRONMENT_CONFIG,
  assertWaveEnvironmentConfigInvariants,
  waveEnvironmentConfigSchema,
} from "@/game/unloading/waveEnvironmentConfig";

describe("waveEnvironmentConfig", () => {
  it("parses defaults", () => {
    expect(() =>
      waveEnvironmentConfigSchema.parse(DEFAULT_WAVE_ENVIRONMENT_CONFIG),
    ).not.toThrow();
  });

  it("keeps larger heave than the legacy Phase 2/3 hard-coded sum", () => {
    const legacyPeak = 0.16 + 0.06 + 0.03;
    const peak = DEFAULT_WAVE_ENVIRONMENT_CONFIG.heave.amplitudes.reduce(
      (a, b) => a + b,
      0,
    );
    expect(peak).toBeGreaterThan(legacyPeak * 2);
  });

  it("rejects non-positive heave scale", () => {
    expect(() =>
      waveEnvironmentConfigSchema.parse({
        ...DEFAULT_WAVE_ENVIRONMENT_CONFIG,
        heaveAmplitudeScale: 0,
      }),
    ).toThrow();
  });

  it("rejects inverted envelope min/max via invariant", () => {
    const bad = {
      ...DEFAULT_WAVE_ENVIRONMENT_CONFIG,
      envelope: {
        ...DEFAULT_WAVE_ENVIRONMENT_CONFIG.envelope,
        minScale: 2,
        maxScale: 0.5,
      },
    };
    // Schema allows any positives; invariant enforces order.
    expect(() => waveEnvironmentConfigSchema.parse(bad)).not.toThrow();
    expect(() => assertWaveEnvironmentConfigInvariants(bad)).toThrow(/minScale/);
  });

  it("accepts a calmer envelope band", () => {
    const calm = waveEnvironmentConfigSchema.parse({
      ...DEFAULT_WAVE_ENVIRONMENT_CONFIG,
      envelope: {
        minScale: 0.9,
        maxScale: 1.1,
        noiseSpeed: 0.05,
        noiseLane: 0,
      },
    });
    expect(() => assertWaveEnvironmentConfigInvariants(calm)).not.toThrow();
  });
});
