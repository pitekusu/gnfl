import {
  DEFAULT_UNLOADING_LAYOUT,
  type UnloadingLayout,
} from "@/game/unloading/layout";
import {
  DEFAULT_INTERLOCK_CONFIG,
  type InterlockConfig,
} from "@/game/unloading/interlockConfig";

/**
 * Derived heights used by clear-of-hold and seating checks.
 * Pure helpers so later commits share one definition.
 */

/** Approximate hold mouth (top of hold walls) in ship-local Y (down positive). */
export function holdMouthLocalY(
  layout: UnloadingLayout = DEFAULT_UNLOADING_LAYOUT,
): number {
  // Floor local Y minus wall height (walls rise "up" = smaller Y).
  return layout.ship.holdFloorOffsetY - layout.ship.holdWallHeight;
}

/**
 * World Y the cask center must rise above (when ship is at rest pose)
 * to count as clear-of-hold. Later commits can recompute with live ship heave.
 */
export function clearOfHoldCaskCenterYRest(
  layout: UnloadingLayout = DEFAULT_UNLOADING_LAYOUT,
  interlock: InterlockConfig = DEFAULT_INTERLOCK_CONFIG,
): number {
  const mouthWorldY = layout.ship.restCenterY + holdMouthLocalY(layout);
  // Cask center clears when bottom is above mouth: centerY - halfHeight < mouth
  // ⇒ centerY < mouth + halfHeight for "still in hold" on Y-down...
  // Clear when cask bottom is above mouth: centerY - halfHeight is smaller than mouth.
  // bottom = centerY - halfHeight (top of object toward -Y).
  // Clear: bottom < mouthWorldY - margin  ⇒ centerY < mouthWorldY - margin + halfHeight
  // Actually Y-down: smaller Y is higher in the sky.
  // Mouth is near top of hold opening.
  // Cask is clear when its bottom (centerY - halfHeight) is above mouth (smaller Y than mouth).
  // bottom < mouth - margin  ⇒ centerY - halfH < mouth - margin
  // ⇒ centerY < mouth - margin + halfH
  // For "must be above threshold" we want centerY <= clearThreshold for clear.
  return mouthWorldY - interlock.clearOfHoldMargin - layout.cask.halfHeight;
}

/** Cradle top surface Y (world), Y-down. */
export function cradleTopY(layout: UnloadingLayout = DEFAULT_UNLOADING_LAYOUT): number {
  return layout.cradle.centerY - layout.cradle.halfHeight;
}
