import { z } from "zod";

/**
 * Continuous wind environment for the hanging load (game force units / 1/s).
 * Always-on multi-frequency noise; no discrete gust events.
 */
export const windEnvironmentConfigSchema = z.object({
  /**
   * Peak horizontal force scale when the signed driver is ±1
   * (game force units on the spreader).
   */
  baseForce: z.number().positive(),
  /**
   * Soft mean lean: 0 = symmetric left/right, 1 = fully {@link baseDirectionX}.
   * Keep low so motion feels random both ways.
   */
  directionBias: z.number().nonnegative().max(1),
  baseDirectionX: z.union([z.literal(-1), z.literal(1)]),
  /**
   * Time scales (× elapsedSeconds) for three noise bands mixed into the
   * signed driver. Higher = faster left/right wobble.
   */
  slowSpeed: z.number().positive(),
  midSpeed: z.number().positive(),
  fastSpeed: z.number().positive(),
  /** Mix weights for slow/mid/fast bands (renormalized; need not sum to 1). */
  slowWeight: z.number().nonnegative(),
  midWeight: z.number().nonnegative(),
  fastWeight: z.number().nonnegative(),
  /** Noise lanes for the three bands. */
  slowLane: z.number().int().nonnegative(),
  midLane: z.number().int().nonnegative(),
  fastLane: z.number().int().nonnegative(),
  /**
   * Exponent &lt; 1 stretches |noise| away from 0 (less “dead calm” mid-crossing).
   * 0.55–0.75 feels lively without slamming.
   */
  responseExponent: z.number().positive().max(2),
  /**
   * Floor on |signed| after shaping so the load rarely goes fully slack.
   * 0.25–0.4 is a light always-on push.
   */
  minSignedAbs: z.number().nonnegative().max(0.95),
  /**
   * Vertical force as a fraction of |horizontal| (Y-down positive = down).
   */
  verticalCoupling: z.number().min(-0.5).max(0.5),
  /** Absolute clamp on |force.x|. */
  maxForceAbs: z.number().positive(),
});

export type WindEnvironmentConfig = z.infer<typeof windEnvironmentConfigSchema>;

/**
 * Moderate strength; multi-band noise so left/right changes feel irregular.
 */
export const DEFAULT_WIND_ENVIRONMENT_CONFIG: WindEnvironmentConfig =
  windEnvironmentConfigSchema.parse({
    baseForce: 72,
    directionBias: 0.08,
    baseDirectionX: -1,
    slowSpeed: 0.11,
    midSpeed: 0.38,
    fastSpeed: 1.05,
    slowWeight: 0.4,
    midWeight: 0.35,
    fastWeight: 0.25,
    slowLane: 41,
    midLane: 42,
    fastLane: 43,
    responseExponent: 0.62,
    minSignedAbs: 0.28,
    verticalCoupling: 0.03,
    maxForceAbs: 110,
  });

export function assertWindEnvironmentConfigInvariants(
  config: WindEnvironmentConfig,
): void {
  if (config.baseForce > config.maxForceAbs) {
    throw new Error("wind baseForce must be <= maxForceAbs");
  }
  const w = config.slowWeight + config.midWeight + config.fastWeight;
  if (w <= 0) {
    throw new Error("wind band weights must sum to a positive value");
  }
}

assertWindEnvironmentConfigInvariants(DEFAULT_WIND_ENVIRONMENT_CONFIG);
