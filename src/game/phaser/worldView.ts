/** Pixels per simulation game unit. */
export const PIXELS_PER_UNIT = 48;

/** World X focus — between ship center and quay face. */
export const CAMERA_FOCUS_X = -2;

/** World Y focus — mid hull / deck band so the ship is not at the bottom edge. */
export const CAMERA_FOCUS_Y = 5.2;

/**
 * Camera fit targets (world units). Smaller = closer zoom = larger greyboxes.
 * Sized to frame ship + gap + quay + cradle without empty ocean.
 */
export const DEMO_WORLD_HEIGHT = 10;

export const DEMO_WORLD_WIDTH = 26;

export function worldToDisplayX(worldX: number): number {
  return worldX * PIXELS_PER_UNIT;
}

export function worldToDisplayY(worldY: number): number {
  return worldY * PIXELS_PER_UNIT;
}

export function worldSizeToDisplay(size: number): number {
  return size * PIXELS_PER_UNIT;
}
