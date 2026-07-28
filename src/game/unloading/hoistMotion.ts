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
 * Ground-break interlock: scale hoist-up (positive axis) when the load is not locked.
 * Lowering (negative axis) is always allowed so the spreader can be seated onto the cask.
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
