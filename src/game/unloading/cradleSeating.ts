import type { InterlockConfig } from "@/game/unloading/interlockConfig";

export interface CradleSeatingPose {
  x: number;
  y: number;
  angleRad: number;
  vx: number;
  vy: number;
}

export interface CradleSeatingInput {
  cask: CradleSeatingPose;
  caskHalfHeight: number;
  cradleCenterX: number;
  /** World Y of cradle top surface (Y-down). */
  cradleTopY: number;
  interlock: InterlockConfig;
}

export interface CradleSeatingResult {
  ok: boolean;
  horizontalError: number;
  /** How far the cask bottom is above the cradle top (0 = touching; + = floating). */
  gapAboveCradle: number;
  angleErrorRad: number;
  speed: number;
  reasons: string[];
}

/**
 * Evaluate whether the cask is stably seated on the transporter cradle.
 * Pure — no Rapier. Y grows downward.
 */
export function evaluateCradleSeating(input: CradleSeatingInput): CradleSeatingResult {
  const { cask, interlock } = input;
  const horizontalError = Math.abs(cask.x - input.cradleCenterX);
  const caskBottomY = cask.y + input.caskHalfHeight;
  // Floating above pad: cradleTop > bottom (bottom is higher / smaller Y when floating).
  // Y-down: floating ⇒ bottomY < cradleTopY ⇒ gapAbove = cradleTopY - bottomY > 0.
  const gapAboveCradle = input.cradleTopY - caskBottomY;
  const angleErrorRad = Math.abs(normalizeAngle(cask.angleRad));
  const speed = Math.hypot(cask.vx, cask.vy);

  const reasons: string[] = [];
  if (horizontalError > interlock.seatMaxHorizontalError) {
    reasons.push("horizontal");
  }
  // Too high above the pad, or deeply penetrating past the pad.
  if (gapAboveCradle > interlock.seatMaxVerticalError) {
    reasons.push("vertical");
  }
  if (gapAboveCradle < -interlock.seatMaxVerticalError * 1.5) {
    reasons.push("vertical");
  }
  if (angleErrorRad > interlock.seatMaxAngleErrorRad) {
    reasons.push("angle");
  }
  if (speed > interlock.seatMaxSpeed) {
    reasons.push("speed");
  }

  return {
    ok: reasons.length === 0,
    horizontalError,
    gapAboveCradle,
    angleErrorRad,
    speed,
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
