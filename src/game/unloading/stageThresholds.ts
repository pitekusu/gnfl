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
 * World Y threshold for cask center (Y-down): clear when centerY <= this value.
 * Uses live ship world Y so heave moves the hold mouth with the hull.
 */
export function clearOfHoldCaskCenterY(
  shipWorldY: number,
  layout: UnloadingLayout = DEFAULT_UNLOADING_LAYOUT,
  interlock: InterlockConfig = DEFAULT_INTERLOCK_CONFIG,
): number {
  const mouthWorldY = shipWorldY + holdMouthLocalY(layout);
  // Y-down: smaller Y is higher. Threshold is above the mouth by margin + half cask
  // so the cask body (not just its top) is clear of the hold opening.
  return mouthWorldY - interlock.clearOfHoldMargin - layout.cask.halfHeight;
}

/** Rest-pose convenience (ship not heaving). */
export function clearOfHoldCaskCenterYRest(
  layout: UnloadingLayout = DEFAULT_UNLOADING_LAYOUT,
  interlock: InterlockConfig = DEFAULT_INTERLOCK_CONFIG,
): number {
  return clearOfHoldCaskCenterY(layout.ship.restCenterY, layout, interlock);
}

/** True when the cask center is high enough to count as clear of the hold. */
export function isCaskClearOfHold(
  caskCenterY: number,
  shipWorldY: number,
  layout: UnloadingLayout = DEFAULT_UNLOADING_LAYOUT,
  interlock: InterlockConfig = DEFAULT_INTERLOCK_CONFIG,
): boolean {
  return caskCenterY <= clearOfHoldCaskCenterY(shipWorldY, layout, interlock);
}

/** Cradle top surface Y (world), Y-down. */
export function cradleTopY(layout: UnloadingLayout = DEFAULT_UNLOADING_LAYOUT): number {
  return layout.cradle.centerY - layout.cradle.halfHeight;
}
