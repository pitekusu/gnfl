import { z } from "zod";

/**
 * Continuous wind on the hanging load (game force units).
 * Multi-frequency zero-mean driver so left and right both appear.
 */
export const windEnvironmentConfigSchema = z.object({
  /** Peak |force| when the driver is ±1. */
  baseForce: z.number().positive(),
  /**
   * Primary oscillation rate (rad/s) for a seeded sine (guarantees both signs).
   */
  oscFrequency: z.number().positive(),
  /** Weight of the sine vs noise in the signed driver (0..1 sine). */
  oscWeight: z.number().min(0).max(1),
  /**
   * Extra irregular noise bands (weights renormalized with each other for the noise part).
   */
  midSpeed: z.number().positive(),
  fastSpeed: z.number().positive(),
  midWeight: z.number().nonnegative(),
  fastWeight: z.number().nonnegative(),
  midLane: z.number().int().nonnegative(),
  fastLane: z.number().int().nonnegative(),
  /**
   * Soft lean toward baseDirectionX (0 = none). Keep near 0 for random left/right.
   */
  directionBias: z.number().nonnegative().max(0.35),
  baseDirectionX: z.union([z.literal(-1), z.literal(1)]),
  /** Vertical force as a fraction of |horizontal| (Y-down). */
  verticalCoupling: z.number().min(-0.5).max(0.5),
  maxForceAbs: z.number().positive(),
});

export type WindEnvironmentConfig = z.infer<typeof windEnvironmentConfigSchema>;

export const DEFAULT_WIND_ENVIRONMENT_CONFIG: WindEnvironmentConfig =
  windEnvironmentConfigSchema.parse({
    baseForce: 45,
    // ~0.35 Hz horizontal push that must visit both signs.
    oscFrequency: 2.15,
    oscWeight: 0.55,
    midSpeed: 0.45,
    fastSpeed: 1.35,
    midWeight: 0.55,
    fastWeight: 0.45,
    midLane: 51,
    fastLane: 52,
    directionBias: 0,
    baseDirectionX: -1,
    verticalCoupling: 0.03,
    maxForceAbs: 70,
  });

export function assertWindEnvironmentConfigInvariants(
  config: WindEnvironmentConfig,
): void {
  if (config.baseForce > config.maxForceAbs) {
    throw new Error("wind baseForce must be <= maxForceAbs");
  }
  if (config.midWeight + config.fastWeight <= 0 && config.oscWeight < 1) {
    throw new Error("wind needs oscWeight > 0 or positive noise weights");
  }
}

assertWindEnvironmentConfigInvariants(DEFAULT_WIND_ENVIRONMENT_CONFIG);
