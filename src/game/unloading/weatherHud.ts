/**
 * Format continuous weather hints for the React HUD (greybox, Japanese labels).
 * Pure — same numbers ⇒ same strings.
 */

/** Treat near-zero wind as calm so the meter does not flicker L/R. */
export const WIND_HUD_DEADBAND = 0.05;

/**
 * windHint is forceX / maxForceAbs in roughly [-1, 1].
 * Positive X is right in the unloading layout.
 */
export function formatWindHud(windHint: number): string {
  if (!Number.isFinite(windHint) || Math.abs(windHint) < WIND_HUD_DEADBAND) {
    return "弱";
  }
  const side = windHint < 0 ? "左" : "右";
  return `${side} ${Math.abs(windHint).toFixed(2)}`;
}

/**
 * waveHint is signed ship heave (game units). Positive = +Y (down in our frame).
 */
export function formatWaveHud(waveHint: number): string {
  if (!Number.isFinite(waveHint)) {
    return "0.00";
  }
  const sign = waveHint >= 0 ? "+" : "−";
  return `${sign}${Math.abs(waveHint).toFixed(2)}`;
}
