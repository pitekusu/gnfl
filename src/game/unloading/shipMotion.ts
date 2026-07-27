import { seedPhase } from "@/game/unloading/seedHash";

export interface ShipRestPose {
  x: number;
  y: number;
}

export interface ShipTransform {
  x: number;
  y: number;
  /** Pitch in radians (small). Positive tilts clockwise in our Y-down frame. */
  angleRad: number;
  /** Base heave offset used for weather visual hints. */
  heave: number;
  pitch: number;
}

export interface BaseShipMotionOptions {
  /**
   * Extra multiplier for high-wave events (Phase 4).
   * 0 = calm base motion only; 1 ≈ double amplitude. Clamped to [0, 2].
   */
  highWaveEnvelope?: number;
}

/**
 * Seeded low-frequency heave + pitch for the moored ship.
 * Pure function: same seed + time ⇒ same pose (no Math.random).
 */
export function sampleBaseShipMotion(
  seed: string,
  elapsedSeconds: number,
  rest: ShipRestPose,
  options: BaseShipMotionOptions = {},
): ShipTransform {
  const envelope = clamp(options.highWaveEnvelope ?? 0, 0, 2);
  const ampScale = 1 + envelope;

  const p0 = seedPhase(seed, 0);
  const p1 = seedPhase(seed, 1);
  const p2 = seedPhase(seed, 2);

  const heave =
    (Math.sin(elapsedSeconds * 0.55 + p0) * 0.16 +
      Math.sin(elapsedSeconds * 0.97 + p1) * 0.06 +
      Math.sin(elapsedSeconds * 1.41 + p2) * 0.03) *
    ampScale;

  const pitch =
    (Math.sin(elapsedSeconds * 0.41 + p1) * 0.022 +
      Math.sin(elapsedSeconds * 0.73 + p0) * 0.01 +
      Math.sin(elapsedSeconds * 1.19 + p2) * 0.006) *
    ampScale;

  return {
    x: rest.x,
    y: rest.y + heave,
    angleRad: pitch,
    heave,
    pitch,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
