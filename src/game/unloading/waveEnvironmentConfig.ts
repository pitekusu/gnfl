import { z } from "zod";

/**
 * Continuous wave environment for the moored ship (game units / rad / 1/s).
 * Not real sea state — greybox feel only. No discrete high-wave events.
 */
export const waveEnvironmentConfigSchema = z.object({
  /**
   * Extra global scale on heave after summing harmonic terms.
   * 1 ≈ legacy Phase 2/3 amplitude; larger values make the berth rougher.
   */
  heaveAmplitudeScale: z.number().positive(),
  /** Extra global scale on pitch (radians). */
  pitchAmplitudeScale: z.number().positive(),

  /**
   * Three heave harmonics: angular rate (rad/s) and amplitude (game units)
   * before {@link heaveAmplitudeScale} and the time-varying envelope.
   */
  heave: z.object({
    frequencies: z.tuple([
      z.number().positive(),
      z.number().positive(),
      z.number().positive(),
    ]),
    amplitudes: z.tuple([
      z.number().nonnegative(),
      z.number().nonnegative(),
      z.number().nonnegative(),
    ]),
  }),

  /** Three pitch harmonics (rad/s and rad). */
  pitch: z.object({
    frequencies: z.tuple([
      z.number().positive(),
      z.number().positive(),
      z.number().positive(),
    ]),
    amplitudes: z.tuple([
      z.number().nonnegative(),
      z.number().nonnegative(),
      z.number().nonnegative(),
    ]),
  }),

  /**
   * Slow seeded envelope that multiplies wave amplitude over time.
   * Unit noise is remapped to [minScale, maxScale].
   */
  envelope: z.object({
    minScale: z.number().positive(),
    maxScale: z.number().positive(),
    /**
     * Multiplies elapsed seconds before sampling noise (higher = faster breathing).
     * 0.08 ≈ multi-second swell changes.
     */
    noiseSpeed: z.number().nonnegative(),
    /** Lane index into {@link sampleSeededUnitNoise1D} (keep fixed for a given feel). */
    noiseLane: z.number().int().nonnegative(),
  }),
});

export type WaveEnvironmentConfig = z.infer<typeof waveEnvironmentConfigSchema>;

/**
 * Defaults aim for a rougher berth than Phase 2/3 (~2.5–3× heave) with a
 * breathing envelope. Tuned further when wired into ship motion (next commits).
 */
export const DEFAULT_WAVE_ENVIRONMENT_CONFIG: WaveEnvironmentConfig =
  waveEnvironmentConfigSchema.parse({
    heaveAmplitudeScale: 1,
    pitchAmplitudeScale: 1,
    heave: {
      // Was ~0.55/0.97/1.41 with amps 0.16/0.06/0.03
      frequencies: [0.55, 0.97, 1.41],
      amplitudes: [0.42, 0.18, 0.09],
    },
    pitch: {
      frequencies: [0.41, 0.73, 1.19],
      amplitudes: [0.055, 0.028, 0.015],
    },
    envelope: {
      minScale: 0.65,
      maxScale: 1.55,
      noiseSpeed: 0.09,
      noiseLane: 11,
    },
  });

export function assertWaveEnvironmentConfigInvariants(
  config: WaveEnvironmentConfig,
): void {
  if (config.envelope.minScale > config.envelope.maxScale) {
    throw new Error("wave envelope.minScale must be <= maxScale");
  }
  const heavePeak =
    config.heave.amplitudes.reduce((a, b) => a + b, 0) * config.heaveAmplitudeScale;
  if (heavePeak <= 0) {
    throw new Error("wave heave peak amplitude must be positive");
  }
}

assertWaveEnvironmentConfigInvariants(DEFAULT_WAVE_ENVIRONMENT_CONFIG);
