import { z } from "zod";

/**
 * Continuous wind environment for the hanging load (game force units / 1/s).
 * Always-on; strength and direction vary with seeded noise. No discrete gust events.
 */
export const windEnvironmentConfigSchema = z.object({
  /**
   * Peak horizontal force magnitude scale (game force units on the spreader)
   * when the magnitude modulator is at 1.
   */
  baseForce: z.number().positive(),
  /**
   * Preferred mean direction when {@link directionBias} &gt; 0:
   * -1 = left (shipward), +1 = right (quayward).
   */
  baseDirectionX: z.union([z.literal(-1), z.literal(1)]),
  /**
   * 0 = pure bidirectional (equal time left/right on average).
   * 1 = always {@link baseDirectionX}.
   * Soft bias only; with 0 the wind clearly reverses.
   */
  directionBias: z.number().nonnegative().max(1),
  /**
   * How often the wind direction lattice advances (higher = faster left/right switches).
   * Multiplies elapsed seconds for direction sampling.
   */
  directionSpeed: z.number().positive(),
  /** Lane for direction lattice / noise. */
  directionLane: z.number().int().nonnegative(),
  /**
   * Minimum |force| as a fraction of baseForce (always some push).
   * 0.55 ⇒ never drops below 55% of baseForce.
   */
  minForceFraction: z.number().positive().max(1),
  /**
   * Multiplies elapsed seconds for magnitude noise (strength breathing).
   */
  magnitudeSpeed: z.number().nonnegative(),
  /** Lane for magnitude unit noise. */
  magnitudeLane: z.number().int().nonnegative(),
  /**
   * Optional faster jitter on magnitude (0 mix = off).
   */
  jitterSpeed: z.number().nonnegative(),
  jitterMix: z.number().nonnegative().max(1),
  jitterLane: z.number().int().nonnegative(),
  /**
   * Vertical force as a fraction of |horizontal| (Y-down positive = down).
   */
  verticalCoupling: z.number().min(-0.5).max(0.5),
  /** Absolute clamp on |force.x|. */
  maxForceAbs: z.number().positive(),
});

export type WindEnvironmentConfig = z.infer<typeof windEnvironmentConfigSchema>;

/**
 * Strong, always-on wind that spends time both left and right.
 */
export const DEFAULT_WIND_ENVIRONMENT_CONFIG: WindEnvironmentConfig =
  windEnvironmentConfigSchema.parse({
    baseForce: 140,
    baseDirectionX: -1,
    directionBias: 0,
    // ~ flip every few seconds (lattice cell width ≈ 1 / directionSpeed seconds at cell step 1)
    directionSpeed: 0.22,
    directionLane: 31,
    minForceFraction: 0.6,
    magnitudeSpeed: 0.18,
    magnitudeLane: 32,
    jitterSpeed: 0.7,
    jitterMix: 0.2,
    jitterLane: 33,
    verticalCoupling: 0.04,
    maxForceAbs: 220,
  });

export function assertWindEnvironmentConfigInvariants(
  config: WindEnvironmentConfig,
): void {
  if (config.baseForce > config.maxForceAbs) {
    throw new Error("wind baseForce must be <= maxForceAbs");
  }
}

assertWindEnvironmentConfigInvariants(DEFAULT_WIND_ENVIRONMENT_CONFIG);
