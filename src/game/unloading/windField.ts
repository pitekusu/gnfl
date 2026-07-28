import {
  sampleSeededNoise1D,
  sampleSeededUnitNoise1D,
} from "@/game/unloading/seededNoise";
import {
  DEFAULT_WIND_ENVIRONMENT_CONFIG,
  type WindEnvironmentConfig,
} from "@/game/unloading/windEnvironmentConfig";

export interface WindSample {
  /** Force on the load in world axes (Y-down). */
  forceX: number;
  forceY: number;
  /**
   * Signed strength hint for HUD / visuals in roughly [-1, 1]
   * (forceX / maxForceAbs).
   */
  windHint: number;
  /**
   * Blended signed driver in [-1, 1] after bias + noise
   * (debug / tests; positive = +X wind).
   */
  signed: number;
  /** Slow unit noise in [0, 1] used for magnitude modulation. */
  unit: number;
}

/**
 * Continuous seeded wind at time t. Pure — same seed + t + config ⇒ same sample.
 *
 * Direction can reverse over time:
 *   signedNoise ∈ [-1, 1] from smooth noise (+ optional jitter)
 *   signed = baseDirectionX * (1 - variation) + signedNoise * variation
 *   mag = baseForce * (minMag + (1 - minMag) * |signedNoise blended unit|)
 *   forceX = clamp(baseForce * signed, ±maxForceAbs) with magnitude from |signed|
 *
 * Simpler equivalent used here:
 *   forceX = baseForce * signed, then clamp
 * so variation=0 → constant baseDirectionX * baseForce
 * variation=1 → fully bidirectional noise
 */
export function sampleWind(
  seed: string,
  elapsedSeconds: number,
  config: WindEnvironmentConfig = DEFAULT_WIND_ENVIRONMENT_CONFIG,
): WindSample {
  const primarySigned =
    config.noiseSpeed <= 0
      ? 0
      : sampleSeededNoise1D(seed, config.noiseLane, elapsedSeconds * config.noiseSpeed);

  let signedNoise = primarySigned;
  if (config.jitterMix > 0 && config.jitterSpeed > 0) {
    const jitter = sampleSeededNoise1D(
      seed,
      config.jitterLane,
      elapsedSeconds * config.jitterSpeed,
    );
    signedNoise = primarySigned * (1 - config.jitterMix) + jitter * config.jitterMix;
  }
  signedNoise = clamp(signedNoise, -1, 1);

  // Bias toward baseDirectionX; variation=1 is fully reversible.
  const v = clamp(config.variation, 0, 1);
  const signed = clamp(config.baseDirectionX * (1 - v) + signedNoise * v, -1, 1);

  // Keep a unit in [0,1] for debug / older tests (remap signed noise).
  const unit =
    config.noiseSpeed <= 0
      ? 0.5
      : sampleSeededUnitNoise1D(
          seed,
          config.noiseLane,
          elapsedSeconds * config.noiseSpeed,
        );

  let forceX = config.baseForce * signed;
  forceX = clamp(forceX, -config.maxForceAbs, config.maxForceAbs);

  const forceY = Math.abs(forceX) * config.verticalCoupling;

  const windHint =
    config.maxForceAbs > 0 ? clamp(forceX / config.maxForceAbs, -1, 1) : 0;

  return { forceX, forceY, windHint, signed, unit };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
