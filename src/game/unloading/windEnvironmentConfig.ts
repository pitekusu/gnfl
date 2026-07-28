import { z } from "zod";

/**
 * Continuous wind environment for the hanging load (game force units / 1/s).
 * Always-on; strength varies with seeded noise. No discrete gust events.
 */
export const windEnvironmentConfigSchema = z.object({
  /**
   * Mean horizontal force magnitude applied toward {@link baseDirectionX}
   * before noise modulation (game force units on the spreader).
   */
  baseForce: z.number().nonnegative(),
  /**
   * Sign of the mean wind: -1 = left (shipward on our layout), +1 = right (quayward).
   * Noise can still reverse the instantaneous force when variation is high.
   */
  baseDirectionX: z.union([z.literal(-1), z.literal(1)]),
  /**
   * How much unit noise scales force around the base.
   * Instant force ≈ baseForce * baseDirectionX * (1 + variation * (2u - 1)).
   * Keep variation ≤ 1 so force does not flip sign unless desired for roughness.
   */
  variation: z.number().nonnegative().max(2),
  /**
   * Multiplies elapsed seconds for the primary strength noise sample.
   * Lower = slower changes in wind strength.
   */
  noiseSpeed: z.number().nonnegative(),
  /** Lane for primary strength noise ({@link sampleSeededUnitNoise1D}). */
  noiseLane: z.number().int().nonnegative(),
  /**
   * Optional second, faster noise mixed in for small jitter (0 = off).
   * Multiplies elapsed seconds for the jitter lane.
   */
  jitterSpeed: z.number().nonnegative(),
  /** Amplitude of jitter mixed into unit noise before force mapping (0..1 typical). */
  jitterMix: z.number().nonnegative().max(1),
  /** Lane for jitter noise. */
  jitterLane: z.number().int().nonnegative(),
  /**
   * Optional vertical force as a fraction of |horizontal| (Y-down positive = down).
   * 0 = pure side wind. Small positive adds a slight downward push.
   */
  verticalCoupling: z.number().min(-0.5).max(0.5),
  /**
   * Absolute clamp on |force.x| after modulation (safety for greybox stability).
   */
  maxForceAbs: z.number().positive(),
});

export type WindEnvironmentConfig = z.infer<typeof windEnvironmentConfigSchema>;

/**
 * Defaults: always some side wind that breathes in strength.
 * Tuned when pure sampleWind + scaffold wiring land (next commits).
 */
export const DEFAULT_WIND_ENVIRONMENT_CONFIG: WindEnvironmentConfig =
  windEnvironmentConfigSchema.parse({
    baseForce: 45,
    baseDirectionX: -1,
    variation: 0.85,
    noiseSpeed: 0.12,
    noiseLane: 21,
    jitterSpeed: 0.55,
    jitterMix: 0.2,
    jitterLane: 22,
    verticalCoupling: 0.05,
    maxForceAbs: 120,
  });

export function assertWindEnvironmentConfigInvariants(
  config: WindEnvironmentConfig,
): void {
  if (config.baseForce > config.maxForceAbs) {
    throw new Error("wind baseForce must be <= maxForceAbs");
  }
  // Peak |scale| ≈ 1 + variation (before clamp).
  const peakScale = 1 + config.variation;
  if (config.baseForce * peakScale > config.maxForceAbs * 1.001) {
    throw new Error(
      "wind baseForce * (1 + variation) should not greatly exceed maxForceAbs",
    );
  }
}

assertWindEnvironmentConfigInvariants(DEFAULT_WIND_ENVIRONMENT_CONFIG);
