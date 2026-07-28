import { sampleSeededNoise1D } from "@/game/unloading/seededNoise";
import {
  DEFAULT_WIND_ENVIRONMENT_CONFIG,
  type WindEnvironmentConfig,
} from "@/game/unloading/windEnvironmentConfig";

export interface WindSample {
  /** Force on the load in world axes (Y-down). */
  forceX: number;
  forceY: number;
  /** Signed strength hint for HUD in roughly [-1, 1] (forceX / maxForceAbs). */
  windHint: number;
  /** Shaped signed driver in [-1, 1] before force scale. */
  signed: number;
}

/**
 * Continuous seeded wind at time t. Pure — same seed + t + config ⇒ same sample.
 *
 * Mixes slow/mid/fast noise so direction flips irregularly (not a single fixed side),
 * keeps a moderate always-on magnitude, and clamps to maxForceAbs.
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

/** Exposed for tests: multi-band signed driver after bias + shaping. */
export function sampleSignedDriver(
  seed: string,
  elapsedSeconds: number,
  config: WindEnvironmentConfig = DEFAULT_WIND_ENVIRONMENT_CONFIG,
): number {
  const wSum = config.slowWeight + config.midWeight + config.fastWeight;
  const slow = sampleSeededNoise1D(
    seed,
    config.slowLane,
    elapsedSeconds * config.slowSpeed,
  );
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

  let mixed =
    (slow * config.slowWeight + mid * config.midWeight + fast * config.fastWeight) /
    wSum;
  mixed = clamp(mixed, -1, 1);

  // Soft lean without locking to one side.
  if (config.directionBias > 0) {
    mixed =
      mixed * (1 - config.directionBias) + config.baseDirectionX * config.directionBias;
    mixed = clamp(mixed, -1, 1);
  }

  return shapeSigned(mixed, config.responseExponent, config.minSignedAbs);
}

/**
 * Stretch |n| away from 0, then enforce a minimum |signed| so the load
 * keeps moving while still reversing when the raw noise crosses zero.
 */
function shapeSigned(n: number, exponent: number, minAbs: number): number {
  const sign = n < 0 ? -1 : n > 0 ? 1 : 0;
  if (sign === 0) {
    // Exact zero: push slightly toward +1 then minAbs will apply via caller bias;
    // return a tiny value that minAbs will lift — pick +minAbs for determinism.
    return minAbs > 0 ? minAbs : 0;
  }
  let mag = Math.pow(Math.abs(n), exponent);
  mag = Math.max(mag, minAbs);
  mag = Math.min(mag, 1);
  return sign * mag;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
