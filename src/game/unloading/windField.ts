import { seedPhase } from "@/game/unloading/seedHash";
import { sampleSeededNoise1D } from "@/game/unloading/seededNoise";
import {
  DEFAULT_WIND_ENVIRONMENT_CONFIG,
  type WindEnvironmentConfig,
} from "@/game/unloading/windEnvironmentConfig";

export interface WindSample {
  forceX: number;
  forceY: number;
  /** forceX / maxForceAbs in [-1, 1]. */
  windHint: number;
  /** Signed driver in [-1, 1] before force scale. */
  signed: number;
}

/**
 * Continuous seeded wind. Pure — same seed + t + config ⇒ same sample.
 *
 * Uses a seeded sine (zero-mean, must go left and right) plus mid/fast noise
 * for irregular wobble, so the load does not stick to one side.
 */
export function sampleWind(
  seed: string,
  elapsedSeconds: number,
  config: WindEnvironmentConfig = DEFAULT_WIND_ENVIRONMENT_CONFIG,
): WindSample {
  const signed = sampleSignedDriver(seed, elapsedSeconds, config);
  let forceX = config.baseForce * signed;
  forceX = clamp(forceX, -config.maxForceAbs, config.maxForceAbs);
  const forceY = Math.abs(forceX) * config.verticalCoupling;
  const windHint =
    config.maxForceAbs > 0 ? clamp(forceX / config.maxForceAbs, -1, 1) : 0;
  return { forceX, forceY, windHint, signed };
}

export function sampleSignedDriver(
  seed: string,
  elapsedSeconds: number,
  config: WindEnvironmentConfig = DEFAULT_WIND_ENVIRONMENT_CONFIG,
): number {
  const phase = seedPhase(seed, 7);
  const osc = Math.sin(elapsedSeconds * config.oscFrequency + phase);

  const nw = config.midWeight + config.fastWeight;
  let noise = 0;
  if (nw > 0) {
    const mid = sampleSeededNoise1D(
      seed,
      config.midLane,
      elapsedSeconds * config.midSpeed,
    );
    const fast = sampleSeededNoise1D(
      seed,
      config.fastLane,
      elapsedSeconds * config.fastSpeed,
    );
    noise = (mid * config.midWeight + fast * config.fastWeight) / nw;
  }

  const ow = clamp(config.oscWeight, 0, 1);
  let signed = osc * ow + noise * (1 - ow);
  signed = clamp(signed, -1, 1);

  if (config.directionBias > 0) {
    signed =
      signed * (1 - config.directionBias) +
      config.baseDirectionX * config.directionBias;
    signed = clamp(signed, -1, 1);
  }

  return signed;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
