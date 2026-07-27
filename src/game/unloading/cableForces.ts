/**
 * Spring-damper cable forces for the greybox crane.
 * Tension only (no compression). Pure math for unit tests.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export interface CableForceParams {
  /** World-space trolley attach point. */
  anchorA: Vec2;
  /** World-space spreader attach point. */
  anchorB: Vec2;
  /** World-space velocity of trolley attach (≈ trolley body velocity). */
  velocityA: Vec2;
  /** World-space velocity of spreader attach. */
  velocityB: Vec2;
  /** Rest / target length commanded by the hoist. */
  targetLength: number;
  stiffness: number;
  damping: number;
  maxTension: number;
}

export interface CableForceResult {
  /** Force applied to the spreader attach (world space). */
  forceOnB: Vec2;
  /** Equal and opposite force on the trolley attach (usually unused for kinematic trolley). */
  forceOnA: Vec2;
  /** Current geometric length. */
  length: number;
  /** Clamped tensile force magnitude (≥ 0). */
  tension: number;
  /** True when the cable is slack (no force). */
  slack: boolean;
}

const EPS = 1e-6;

export function computeCableForce(params: CableForceParams): CableForceResult {
  const dx = params.anchorB.x - params.anchorA.x;
  const dy = params.anchorB.y - params.anchorA.y;
  const length = Math.hypot(dx, dy);

  if (length < EPS || params.targetLength <= 0) {
    return {
      forceOnA: { x: 0, y: 0 },
      forceOnB: { x: 0, y: 0 },
      length,
      tension: 0,
      slack: true,
    };
  }

  const dirX = dx / length;
  const dirY = dy / length;
  const stretch = length - params.targetLength;

  // Separation rate along the cable: positive while lengthening.
  const relVx = params.velocityB.x - params.velocityA.x;
  const relVy = params.velocityB.y - params.velocityA.y;
  const separationRate = relVx * dirX + relVy * dirY;

  let tension = params.stiffness * stretch + params.damping * separationRate;
  if (tension < 0 || stretch <= 0) {
    // No compression / no force when shorter than target (slack allowed slightly via damping).
    // When stretch <= 0, only allow damping that resists further lengthening is skipped — pure slack.
    tension = 0;
  }
  if (tension > params.maxTension) {
    tension = params.maxTension;
  }

  if (tension <= 0) {
    return {
      forceOnA: { x: 0, y: 0 },
      forceOnB: { x: 0, y: 0 },
      length,
      tension: 0,
      slack: true,
    };
  }

  // Pull B toward A.
  const forceOnB = { x: -dirX * tension, y: -dirY * tension };
  const forceOnA = { x: dirX * tension, y: dirY * tension };
  return {
    forceOnA,
    forceOnB,
    length,
    tension,
    slack: false,
  };
}

export function clampCableTargetLength(
  length: number,
  minLength: number,
  maxLength: number,
): number {
  return Math.min(maxLength, Math.max(minLength, length));
}
