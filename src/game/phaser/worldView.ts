/** Pixels per simulation game unit. */
export const PIXELS_PER_UNIT = 56;

/** World X focus — mid berth between ship and quay. */
export const CAMERA_FOCUS_X = -4;

/** World Y used as the camera focus (between rail and deck). */
export const CAMERA_FOCUS_Y = 3.5;

/** Approx vertical span of the unloading greybox scene in world units. */
export const DEMO_WORLD_HEIGHT = 12;

/** Approx horizontal span for camera fit. */
export const DEMO_WORLD_WIDTH = 40;

export function worldToDisplayX(worldX: number): number {
  return worldX * PIXELS_PER_UNIT;
}

export function worldToDisplayY(worldY: number): number {
  return worldY * PIXELS_PER_UNIT;
}

export function worldSizeToDisplay(size: number): number {
  return size * PIXELS_PER_UNIT;
}
