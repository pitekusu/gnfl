import type { LockConfig } from "@/game/unloading/lockConfig";

export interface BodyPose2D {
  x: number;
  y: number;
  angleRad: number;
  vx: number;
  vy: number;
}

export interface LockAlignmentInput {
  spreader: BodyPose2D;
  cask: BodyPose2D;
  /** Half-height of spreader (for face proximity). */
  spreaderHalfHeight: number;
  /** Half-height of cask. */
  caskHalfHeight: number;
  config: LockConfig;
}

export interface LockAlignmentResult {
  ok: boolean;
  horizontalError: number;
  verticalError: number;
  angleErrorRad: number;
  relativeSpeed: number;
  centerDistance: number;
  /** Human-readable fail reasons (empty when ok). */
  reasons: string[];
}

/**
 * Evaluate whether the spreader is aligned enough to lock onto the cask.
 * Pure — no Rapier. Y grows downward.
 */
export function evaluateLockAlignment(input: LockAlignmentInput): LockAlignmentResult {
  const { spreader, cask, config } = input;
  const horizontalError = Math.abs(spreader.x - cask.x);
  // Ideal: spreader bottom face just above cask top face.
  const idealSpreaderY = cask.y - input.caskHalfHeight - input.spreaderHalfHeight;
  const verticalError = Math.abs(spreader.y - idealSpreaderY);
  const angleErrorRad = Math.abs(normalizeAngle(spreader.angleRad - cask.angleRad));
  const dvx = spreader.vx - cask.vx;
  const dvy = spreader.vy - cask.vy;
  const relativeSpeed = Math.hypot(dvx, dvy);
  const centerDistance = Math.hypot(spreader.x - cask.x, spreader.y - cask.y);

  const reasons: string[] = [];
  if (horizontalError > config.maxHorizontalError) {
    reasons.push("horizontal");
  }
  if (verticalError > config.maxVerticalError) {
    reasons.push("vertical");
  }
  if (angleErrorRad > config.maxAngleErrorRad) {
    reasons.push("angle");
  }
  if (relativeSpeed > config.maxRelativeSpeed) {
    reasons.push("speed");
  }
  if (centerDistance > config.maxCenterDistance) {
    reasons.push("distance");
  }

  return {
    ok: reasons.length === 0,
    horizontalError,
    verticalError,
    angleErrorRad,
    relativeSpeed,
    centerDistance,
    reasons,
  };
}

function normalizeAngle(angle: number): number {
  const twoPi = Math.PI * 2;
  let a = angle;
  while (a > Math.PI) {
    a -= twoPi;
  }
  while (a < -Math.PI) {
    a += twoPi;
  }
  return a;
}
