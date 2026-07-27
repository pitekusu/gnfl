/** Pixels per simulation game unit. */
export const PIXELS_PER_UNIT = 48;

/** World Y used as the camera focus (between drop height and floor). */
export const CAMERA_FOCUS_Y = 4;

export function worldToDisplayX(worldX: number): number {
  return worldX * PIXELS_PER_UNIT;
}

export function worldToDisplayY(worldY: number): number {
  return worldY * PIXELS_PER_UNIT;
}

export function worldSizeToDisplay(size: number): number {
  return size * PIXELS_PER_UNIT;
}
