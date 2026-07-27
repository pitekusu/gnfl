/**
 * Rail-constrained trolley kinematics (1D along X).
 * Pure helpers — Rapier only receives the resulting kinematic pose.
 */

import { scaleSpeedForFineMode } from "@/game/unloading/fineMode";

export function applyAxisDeadzone(axis: number, deadzone: number): number {
  const a = clamp(axis, -1, 1);
  if (Math.abs(a) <= deadzone) {
    return 0;
  }
  // Rescale so values just outside the deadzone start from 0.
  const sign = a < 0 ? -1 : 1;
  return sign * ((Math.abs(a) - deadzone) / (1 - deadzone));
}

export interface TrolleyIntegrateParams {
  x: number;
  velocity: number;
  axis: number;
  dtSeconds: number;
  maxSpeed: number;
  acceleration: number;
  axisDeadzone: number;
  fineMode: boolean;
  fineSpeedScale: number;
  railMinX: number;
  railMaxX: number;
  /** Half-width of trolley body; clamps center so the body stays on the rail span. */
  trolleyHalfWidth: number;
}

export interface TrolleyIntegrateResult {
  x: number;
  velocity: number;
}

export function integrateTrolleyOnRail(
  params: TrolleyIntegrateParams,
): TrolleyIntegrateResult {
  const drive = applyAxisDeadzone(params.axis, params.axisDeadzone);
  const maxSpeed = scaleSpeedForFineMode(
    params.maxSpeed,
    params.fineMode,
    params.fineSpeedScale,
  );
  const targetVelocity = drive * maxSpeed;

  let velocity = params.velocity;
  const deltaV = targetVelocity - velocity;
  const maxDelta = params.acceleration * params.dtSeconds;
  if (Math.abs(deltaV) <= maxDelta) {
    velocity = targetVelocity;
  } else {
    velocity += Math.sign(deltaV) * maxDelta;
  }

  let x = params.x + velocity * params.dtSeconds;
  const minX = params.railMinX + params.trolleyHalfWidth;
  const maxX = params.railMaxX - params.trolleyHalfWidth;
  if (x < minX) {
    x = minX;
    velocity = 0;
  } else if (x > maxX) {
    x = maxX;
    velocity = 0;
  }

  return { x, velocity };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
