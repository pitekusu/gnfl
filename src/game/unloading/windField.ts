import { sampleSeededUnitNoise1D } from "@/game/unloading/seededNoise";
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
   * (base direction × modulated unit strength).
   */
  windHint: number;
  /** Unit noise in [0, 1] after jitter mix (debug / tests). */
  unit: number;
}

/**
 * Continuous seeded wind at time t. Pure — same seed + t + config ⇒ same sample.
 *
 * Force model (from config comments):
 *   unit ∈ [0,1] from slow noise (+ optional jitter)
 *   scale = 1 + variation * (2*unit - 1)
 *   forceX = clamp(baseForce * baseDirectionX * scale, ±maxForceAbs)
 *   forceY = |forceX| * verticalCoupling  (Y-down)
 */
export function sampleWind(
  seed: string,
  elapsedSeconds: number,
  config: WindEnvironmentConfig = DEFAULT_WIND_ENVIRONMENT_CONFIG,
): WindSample {
  const primary =
    config.noiseSpeed <= 0
      ? 0.5
      : sampleSeededUnitNoise1D(
          seed,
          config.noiseLane,
          elapsedSeconds * config.noiseSpeed,
        );

  let unit = primary;
  if (config.jitterMix > 0 && config.jitterSpeed > 0) {
    const jitter = sampleSeededUnitNoise1D(
      seed,
      config.jitterLane,
      elapsedSeconds * config.jitterSpeed,
    );
    unit = primary * (1 - config.jitterMix) + jitter * config.jitterMix;
  }
  unit = clamp(unit, 0, 1);

  const scale = 1 + config.variation * (2 * unit - 1);
  let forceX = config.baseForce * config.baseDirectionX * scale;
  forceX = clamp(forceX, -config.maxForceAbs, config.maxForceAbs);

  const forceY = Math.abs(forceX) * config.verticalCoupling;

  // Hint: signed magnitude relative to max clamp for readable HUD range.
  const windHint =
    config.maxForceAbs > 0 ? clamp(forceX / config.maxForceAbs, -1, 1) : 0;

  return { forceX, forceY, windHint, unit };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
