import type { RenderEntityState } from "@/game/protocol";
import {
  UNLOADING_TEXTURE_KEYS,
  type UnloadingTextureKey,
} from "@/game/phaser/unloadingAssetPaths";

/**
 * Display-only registry: snapshot entity `kind` → texture, depth, origin, greybox colors.
 * Physics sizes still come from the snapshot / layout — never from SVG paths.
 */

export type EntityKind = RenderEntityState["kind"];

export interface EntityDisplayConfig {
  kind: EntityKind;
  /** Phaser depth (higher draws later). */
  depth: number;
  originX: number;
  originY: number;
  /**
   * Primary texture when loaded (C5). Null → always greybox rectangle.
   * Ship uses rear hull as primary; foreground mask is a separate layer (C6).
   */
  textureKey: UnloadingTextureKey | null;
  /** Optional second texture (e.g. ship hold foreground mask). */
  overlayTextureKey: UnloadingTextureKey | null;
  /** Greybox fill (0xRRGGBB). */
  fillColor: number;
  /** Greybox stroke. */
  strokeColor: number;
  /** Fill alpha for hollow-style greybox (ship hold). */
  fillAlpha: number;
  strokeWidth: number;
}

const DEFAULT_ORIGIN = { originX: 0.5, originY: 0.5 } as const;

/**
 * Authoritative display table for unloading greybox kinds.
 * Depths match art/asset-notes draft so SVG swap keeps read order.
 */
const ENTITY_DISPLAY_BY_KIND: Record<EntityKind, EntityDisplayConfig> = {
  box: {
    kind: "box",
    depth: 5,
    ...DEFAULT_ORIGIN,
    textureKey: null,
    overlayTextureKey: null,
    fillColor: 0x4f9cff,
    strokeColor: 0xa8d0ff,
    fillAlpha: 1,
    strokeWidth: 3,
  },
  floor: {
    kind: "floor",
    depth: 4,
    ...DEFAULT_ORIGIN,
    textureKey: null,
    overlayTextureKey: null,
    fillColor: 0x3a4f5f,
    strokeColor: 0x8fa6b8,
    fillAlpha: 1,
    strokeWidth: 3,
  },
  quay: {
    kind: "quay",
    depth: 5,
    ...DEFAULT_ORIGIN,
    textureKey: null,
    overlayTextureKey: null,
    fillColor: 0x3a4f5f,
    strokeColor: 0x8fa6b8,
    fillAlpha: 1,
    strokeWidth: 3,
  },
  cradle: {
    kind: "cradle",
    depth: 5,
    ...DEFAULT_ORIGIN,
    // Pad body; seating frames are extra layers later.
    textureKey: UNLOADING_TEXTURE_KEYS.transporterBody,
    overlayTextureKey: UNLOADING_TEXTURE_KEYS.seatingFrameFront,
    fillColor: 0x5a4632,
    strokeColor: 0xc4a574,
    fillAlpha: 1,
    strokeWidth: 3,
  },
  ship: {
    kind: "ship",
    depth: 8,
    ...DEFAULT_ORIGIN,
    textureKey: UNLOADING_TEXTURE_KEYS.shipBodyRear,
    overlayTextureKey: UNLOADING_TEXTURE_KEYS.shipHoldForeground,
    fillColor: 0x7eb3d4,
    strokeColor: 0xb8d4e8,
    // Hollow hold so free cask stays visible in greybox.
    fillAlpha: 0.18,
    strokeWidth: 4,
  },
  trolley: {
    kind: "trolley",
    depth: 18,
    ...DEFAULT_ORIGIN,
    textureKey: UNLOADING_TEXTURE_KEYS.craneTrolley,
    overlayTextureKey: null,
    fillColor: 0xf0a030,
    strokeColor: 0xffe0a8,
    fillAlpha: 1,
    strokeWidth: 3,
  },
  spreader: {
    kind: "spreader",
    depth: 18,
    ...DEFAULT_ORIGIN,
    textureKey: UNLOADING_TEXTURE_KEYS.spreader,
    overlayTextureKey: null,
    fillColor: 0xd4573a,
    strokeColor: 0xffc4b0,
    fillAlpha: 1,
    strokeWidth: 3,
  },
  cask: {
    kind: "cask",
    depth: 14,
    ...DEFAULT_ORIGIN,
    textureKey: UNLOADING_TEXTURE_KEYS.transportCask,
    overlayTextureKey: null,
    fillColor: 0xffb020,
    strokeColor: 0xffe0a0,
    fillAlpha: 1,
    strokeWidth: 4,
  },
  unknown: {
    kind: "unknown",
    depth: 5,
    ...DEFAULT_ORIGIN,
    textureKey: null,
    overlayTextureKey: null,
    fillColor: 0x4f9cff,
    strokeColor: 0xa8d0ff,
    fillAlpha: 1,
    strokeWidth: 3,
  },
};

/** Depth for ship hold foreground mask when drawn as a sibling of the hull. */
export const SHIP_HOLD_FOREGROUND_DEPTH = 16;

/** Depth for runtime cable lines (above spreader). */
export const CABLE_DRAW_DEPTH = 20;

/** Depth for berth backdrop plate. */
export const BERTH_BACKDROP_DEPTH = 0;

export function resolveEntityDisplay(kind: EntityKind): EntityDisplayConfig {
  return ENTITY_DISPLAY_BY_KIND[kind] ?? ENTITY_DISPLAY_BY_KIND.unknown;
}

/** All kinds that prefer a primary texture when the loader succeeds. */
export function entityKindsWithTextures(): EntityKind[] {
  return (Object.keys(ENTITY_DISPLAY_BY_KIND) as EntityKind[]).filter(
    (k) => ENTITY_DISPLAY_BY_KIND[k].textureKey != null,
  );
}

/**
 * True when the scene should try an Image instead of a Rectangle for this kind.
 * Texture presence is checked by the loader/scene (C5), not here.
 */
export function prefersTexturedDisplay(kind: EntityKind): boolean {
  return resolveEntityDisplay(kind).textureKey != null;
}
