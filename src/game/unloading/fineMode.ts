/**
 * Fine-mode speed scaling for trolley and hoist.
 * Using fine mode is a skill choice; it is not a scoring penalty by itself.
 */
export function scaleSpeedForFineMode(
  maxSpeed: number,
  fineMode: boolean,
  fineSpeedScale: number,
): number {
  if (!fineMode) {
    return maxSpeed;
  }
  return maxSpeed * fineSpeedScale;
}
