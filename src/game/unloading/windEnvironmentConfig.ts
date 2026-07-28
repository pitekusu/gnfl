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
   * How strongly signed noise can override {@link baseDirectionX}.
   * 0 = constant wind in baseDirectionX only.
   * 1 = fully bidirectional (left and right over time).
   * Instant signed driver = baseDirectionX * (1 - variation) + noise * variation.
   */
  variation: z.number().nonnegative().max(1),
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
    baseForce: 50,
    baseDirectionX: -1,
    // High enough that wind clearly reverses left/right over time.
    variation: 1,
    noiseSpeed: 0.14,
    noiseLane: 21,
    jitterSpeed: 0.6,
    jitterMix: 0.25,
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
  // |forceX| peaks near baseForce when |signed| = 1.
  if (config.baseForce > config.maxForceAbs * 1.001) {
    throw new Error("wind baseForce must be <= maxForceAbs");
  }
}

assertWindEnvironmentConfigInvariants(DEFAULT_WIND_ENVIRONMENT_CONFIG);
