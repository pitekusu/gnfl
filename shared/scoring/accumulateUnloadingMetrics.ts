import {
  createZeroUnloadingMetrics,
  type UnloadingMetrics,
} from "@shared/contracts/unloadingMetrics";
import {
  UNLOADING_RULESET_V1,
  type UnloadingRuleset,
} from "@shared/rulesets/unloadingV1";

/**
 * Pure metrics accumulation for unloading runs.
 * Scaffold (C6) feeds one sample per physics tick; no I/O, no Math.random.
 */

/** Continuous per-tick observations (magnitudes, game units). */
export interface UnloadingMetricsTickSample {
  /** Lateral sway magnitude used for peak + integral. */
  sway: number;
  /** Cable tension / load magnitude. */
  cableLoad: number;
  /** Cask linear acceleration magnitude (0 if not tracked this tick). */
  caskAcceleration: number;
  /** Non-zero when a contact impulse occurred this tick. */
  collisionImpulseDelta?: number;
  /** True when an interlock cut motion / safety trip fired this tick. */
  interlockTripped?: boolean;
}

/** One-shot landing snapshot (typically when SEATED is accepted). */
export interface UnloadingLandingSample {
  positionError: number;
  angleError: number;
  verticalSpeed: number;
  horizontalSpeed: number;
}

function finiteNonNeg(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value;
}

/**
 * Advance metrics by one physics tick.
 * Does not mutate `prev` — returns a new object.
 */
export function accumulateUnloadingMetricsTick(
  prev: UnloadingMetrics,
  sample: UnloadingMetricsTickSample,
  ruleset: UnloadingRuleset = UNLOADING_RULESET_V1,
): UnloadingMetrics {
  const sway = finiteNonNeg(sample.sway);
  const cableLoad = finiteNonNeg(sample.cableLoad);
  const accel = finiteNonNeg(sample.caskAcceleration);
  const collisionImpulseDelta = finiteNonNeg(sample.collisionImpulseDelta ?? 0);

  const highCable =
    cableLoad > ruleset.highCableLoadThreshold
      ? prev.highCableLoadTicks + 1
      : prev.highCableLoadTicks;

  return {
    maximumSway: Math.max(prev.maximumSway, sway),
    integratedSway: prev.integratedSway + sway,
    maximumCableLoad: Math.max(prev.maximumCableLoad, cableLoad),
    highCableLoadTicks: highCable,
    maximumCaskAcceleration: Math.max(prev.maximumCaskAcceleration, accel),
    collisionImpulse: prev.collisionImpulse + collisionImpulseDelta,
    collisionCount:
      collisionImpulseDelta > 0 ? prev.collisionCount + 1 : prev.collisionCount,
    landingPositionError: prev.landingPositionError,
    landingAngleError: prev.landingAngleError,
    landingVerticalSpeed: prev.landingVerticalSpeed,
    landingHorizontalSpeed: prev.landingHorizontalSpeed,
    interlockCount: sample.interlockTripped
      ? prev.interlockCount + 1
      : prev.interlockCount,
    elapsedTicks: prev.elapsedTicks + 1,
  };
}

/**
 * Record landing errors/speeds (magnitudes). Uses max so a later re-seat
 * cannot hide a worse earlier contact if both are reported.
 */
export function accumulateUnloadingLanding(
  prev: UnloadingMetrics,
  landing: UnloadingLandingSample,
): UnloadingMetrics {
  return {
    ...prev,
    landingPositionError: Math.max(
      prev.landingPositionError,
      finiteNonNeg(landing.positionError),
    ),
    landingAngleError: Math.max(
      prev.landingAngleError,
      finiteNonNeg(landing.angleError),
    ),
    landingVerticalSpeed: Math.max(
      prev.landingVerticalSpeed,
      finiteNonNeg(landing.verticalSpeed),
    ),
    landingHorizontalSpeed: Math.max(
      prev.landingHorizontalSpeed,
      finiteNonNeg(landing.horizontalSpeed),
    ),
  };
}

export function createEmptyUnloadingMetrics(): UnloadingMetrics {
  return createZeroUnloadingMetrics();
}
