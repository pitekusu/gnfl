import { applyAxisDeadzone } from "@/game/unloading/trolleyMotion";
import { clampCableTargetLength } from "@/game/unloading/cableForces";

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
  const speedScale = params.fineMode ? params.fineSpeedScale : 1;
  // Positive axis shortens the cable (lift).
  const delta = -drive * params.maxSpeed * speedScale * params.dtSeconds;
  return clampCableTargetLength(
    params.targetLength + delta,
    params.minCableLength,
    params.maxCableLength,
  );
}
