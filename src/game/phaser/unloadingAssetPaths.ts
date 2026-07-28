/**
 * Canonical public paths for unloading-stage display assets.
 * Vite serves `public/` at `/` — do not put colliders or physics sizes here.
 *
 * Layout (game units) stays in `UnloadingLayout`; these paths are display-only.
 */

/** URL prefix for unloading assets (Vite public root). */
export const UNLOADING_ASSET_ROOT = "/assets/unloading" as const;

export const UNLOADING_SVG_DIR = `${UNLOADING_ASSET_ROOT}/svg` as const;
export const UNLOADING_BACKGROUND_DIR = `${UNLOADING_ASSET_ROOT}/backgrounds` as const;

/**
 * Stable Phaser texture keys. Load with the matching {@link unloadingSvgUrl} path.
 * Keys must stay stable so hot-reload and future atlases can remount cleanly.
 */
export const UNLOADING_TEXTURE_KEYS = {
  shipBodyRear: "unloading-ship-body-rear",
  shipHoldForeground: "unloading-ship-hold-foreground",
  craneGantry: "unloading-crane-gantry",
  craneTrolley: "unloading-crane-trolley",
  hoistUnit: "unloading-hoist-unit",
  spreader: "unloading-spreader",
  transportCask: "unloading-transport-cask",
  transporterBody: "unloading-transporter-body",
  seatingFrameRear: "unloading-seating-frame-rear",
  seatingFrameFront: "unloading-seating-frame-front",
  windsock: "unloading-windsock",
  berthBackdrop: "unloading-berth-backdrop",
} as const;

export type UnloadingTextureKey =
  (typeof UNLOADING_TEXTURE_KEYS)[keyof typeof UNLOADING_TEXTURE_KEYS];

/** SVG file basenames (design directive §10.1) under {@link UNLOADING_SVG_DIR}. */
export const UNLOADING_SVG_FILES = {
  shipBodyRear: "ship_body_rear.svg",
  shipHoldForeground: "ship_hold_foreground.svg",
  craneGantry: "crane_gantry.svg",
  craneTrolley: "crane_trolley.svg",
  hoistUnit: "hoist_unit.svg",
  spreader: "spreader.svg",
  transportCask: "transport_cask.svg",
  transporterBody: "transporter_body.svg",
  seatingFrameRear: "seating_frame_rear.svg",
  seatingFrameFront: "seating_frame_front.svg",
  windsock: "windsock.svg",
} as const;

export type UnloadingSvgId = keyof typeof UNLOADING_SVG_FILES;

/** Optional full-bleed berth plate (ChatGPT / WebP when available). */
export const UNLOADING_BACKGROUND_FILES = {
  berthBackdrop: "berth_backdrop.webp",
} as const;

export function unloadingSvgUrl(id: UnloadingSvgId): string {
  return `${UNLOADING_SVG_DIR}/${UNLOADING_SVG_FILES[id]}`;
}

export function unloadingBackgroundUrl(
  id: keyof typeof UNLOADING_BACKGROUND_FILES,
): string {
  return `${UNLOADING_BACKGROUND_DIR}/${UNLOADING_BACKGROUND_FILES[id]}`;
}

/** Texture key for an SVG id (same stem as design names). */
export function textureKeyForSvgId(id: UnloadingSvgId): UnloadingTextureKey {
  const map: Record<UnloadingSvgId, UnloadingTextureKey> = {
    shipBodyRear: UNLOADING_TEXTURE_KEYS.shipBodyRear,
    shipHoldForeground: UNLOADING_TEXTURE_KEYS.shipHoldForeground,
    craneGantry: UNLOADING_TEXTURE_KEYS.craneGantry,
    craneTrolley: UNLOADING_TEXTURE_KEYS.craneTrolley,
    hoistUnit: UNLOADING_TEXTURE_KEYS.hoistUnit,
    spreader: UNLOADING_TEXTURE_KEYS.spreader,
    transportCask: UNLOADING_TEXTURE_KEYS.transportCask,
    transporterBody: UNLOADING_TEXTURE_KEYS.transporterBody,
    seatingFrameRear: UNLOADING_TEXTURE_KEYS.seatingFrameRear,
    seatingFrameFront: UNLOADING_TEXTURE_KEYS.seatingFrameFront,
    windsock: UNLOADING_TEXTURE_KEYS.windsock,
  };
  return map[id];
}

/**
 * Manifest used by the loader (C3+). Paths may 404 until SVG files land (C4).
 * Callers must tolerate missing files and keep greybox rectangles.
 */
export function listUnloadingSvgLoadEntries(): ReadonlyArray<{
  id: UnloadingSvgId;
  key: UnloadingTextureKey;
  url: string;
}> {
  return (Object.keys(UNLOADING_SVG_FILES) as UnloadingSvgId[]).map((id) => ({
    id,
    key: textureKeyForSvgId(id),
    url: unloadingSvgUrl(id),
  }));
}
