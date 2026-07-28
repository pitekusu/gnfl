import { clampCableTargetLength } from "@/game/unloading/cableForces";
import { scaleSpeedForFineMode } from "@/game/unloading/fineMode";
import { applyAxisDeadzone } from "@/game/unloading/trolleyMotion";

export interface HoistIntegrateParams {
  /** Current commanded cable target length (game units). */
  targetLength: number;
  /**
   * Normalized hoist axis in [-1, 1].
   * Positive = hoist up (shorten cable); negative = lower (lengthen cable).
   */
  axis: number;
  dtSeconds: number;
  maxSpeed: number;
  axisDeadzone: number;
  fineMode: boolean;
  fineSpeedScale: number;
  minCableLength: number;
  maxCableLength: number;
}

/**
 * Integrate hoist command into the spring-damper cable target length.
 */
export function integrateCableTargetLength(params: HoistIntegrateParams): number {
  const drive = applyAxisDeadzone(params.axis, params.axisDeadzone);
  const maxSpeed = scaleSpeedForFineMode(
    params.maxSpeed,
    params.fineMode,
    params.fineSpeedScale,
  );
  // Positive axis shortens the cable (lift).
  const delta = -drive * maxSpeed * params.dtSeconds;
  return clampCableTargetLength(
    params.targetLength + delta,
    params.minCableLength,
    params.maxCableLength,
  );
}

/**
 * Optional unlocked hoist-up scale (hard mode can set scale to 0).
 * Default config uses 1 so players can reel cable back after over-paying out.
 * Lowering (negative axis) is always unscaled. Locked always uses full axis.
 * Lifting the cask still requires the lock joint — this only affects cable command.
 */
export function applyUnlockedHoistUpInterlock(
  axis: number,
  locked: boolean,
  unlockedHoistUpSpeedScale: number,
): number {
  if (locked || axis <= 0) {
    return axis;
  }
  return axis * unlockedHoistUpSpeedScale;
}
