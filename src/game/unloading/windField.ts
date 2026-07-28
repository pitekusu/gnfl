import { sampleSeededUnitNoise1D, seedUnit } from "@/game/unloading/seededNoise";
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
  /** Instantaneous direction −1 or +1 after bias. */
  direction: number;
  /** Magnitude modulator in [minForceFraction, 1]. */
  magnitudeScale: number;
}

/**
 * Continuous seeded wind at time t. Pure — same seed + t + config ⇒ same sample.
 *
 * - Direction: slow lattice of ±1 (spends clear time on each side, not stuck +X).
 * - Magnitude: always ≥ minForceFraction * baseForce, breathes with noise.
 */
export function sampleWind(
  seed: string,
  elapsedSeconds: number,
  config: WindEnvironmentConfig = DEFAULT_WIND_ENVIRONMENT_CONFIG,
): WindSample {
  const direction = sampleWindDirection(seed, elapsedSeconds, config);
  const magnitudeScale = sampleMagnitudeScale(seed, elapsedSeconds, config);

  let forceX = config.baseForce * magnitudeScale * direction;
  forceX = clamp(forceX, -config.maxForceAbs, config.maxForceAbs);

  const forceY = Math.abs(forceX) * config.verticalCoupling;
  const windHint =
    config.maxForceAbs > 0 ? clamp(forceX / config.maxForceAbs, -1, 1) : 0;

  return { forceX, forceY, windHint, direction, magnitudeScale };
}

/**
 * Piecewise-constant ±1 direction that holds for ~1/directionSpeed seconds,
 * then picks a new lattice sign (smoothstep blend only near the cell edge).
 */
export function sampleWindDirection(
  seed: string,
  elapsedSeconds: number,
  config: WindEnvironmentConfig = DEFAULT_WIND_ENVIRONMENT_CONFIG,
): number {
  const t = elapsedSeconds * config.directionSpeed;
  const i0 = Math.floor(t);
  const i1 = i0 + 1;
  const f = t - i0;

  let d0 = latticeDirection(seed, config.directionLane, i0);
  let d1 = latticeDirection(seed, config.directionLane, i1);

  // Soft bias: flip a fraction of cells toward baseDirectionX without killing reversals.
  if (config.directionBias > 0) {
    d0 = applyDirectionBias(d0, config.baseDirectionX, config.directionBias, seed, i0);
    d1 = applyDirectionBias(d1, config.baseDirectionX, config.directionBias, seed, i1);
  }

  // Hold most of the cell, blend only in the last 15% so flips are visible but not harsh.
  if (f < 0.85) {
    return d0;
  }
  const u = (f - 0.85) / 0.15;
  const s = u * u * (3 - 2 * u);
  const blended = d0 + (d1 - d0) * s;
  // Avoid long zero: snap to nearest sign if almost zero.
  if (Math.abs(blended) < 0.2) {
    return d1;
  }
  return blended < 0 ? -1 : 1;
}

function sampleMagnitudeScale(
  seed: string,
  elapsedSeconds: number,
  config: WindEnvironmentConfig,
): number {
  const minF = config.minForceFraction;
  if (config.magnitudeSpeed <= 0) {
    return (minF + 1) * 0.5;
  }
  let unit = sampleSeededUnitNoise1D(
    seed,
    config.magnitudeLane,
    elapsedSeconds * config.magnitudeSpeed,
  );
  if (config.jitterMix > 0 && config.jitterSpeed > 0) {
    const jitter = sampleSeededUnitNoise1D(
      seed,
      config.jitterLane,
      elapsedSeconds * config.jitterSpeed,
    );
    unit = unit * (1 - config.jitterMix) + jitter * config.jitterMix;
  }
  unit = clamp(unit, 0, 1);
  return minF + (1 - minF) * unit;
}

function latticeDirection(seed: string, lane: number, cell: number): number {
  // Map hash to a clear ±1 (threshold at 0.5 of unit).
  return seedUnit(`${seed}|dir|${lane}`, cell) < 0.5 ? -1 : 1;
}

function applyDirectionBias(
  dir: number,
  base: number,
  bias: number,
  seed: string,
  cell: number,
): number {
  if (dir === base) {
    return dir;
  }
  // With probability ≈ bias, force the base direction for this cell.
  const roll = seedUnit(`${seed}|bias|${cell}`, cell + 17);
  return roll < bias ? base : dir;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
