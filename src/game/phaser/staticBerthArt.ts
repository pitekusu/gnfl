import type Phaser from "phaser";
import { BERTH_BACKDROP_DEPTH } from "@/game/phaser/entityDisplayRegistry";
import { hasUsableTexture } from "@/game/phaser/unloadingAssetLoader";
import {
  UNLOADING_TEXTURE_KEYS,
  type UnloadingTextureKey,
} from "@/game/phaser/unloadingAssetPaths";
import {
  CAMERA_FOCUS_X,
  CAMERA_FOCUS_Y,
  DEMO_WORLD_HEIGHT,
  DEMO_WORLD_WIDTH,
  worldSizeToDisplay,
  worldToDisplayX,
  worldToDisplayY,
} from "@/game/phaser/worldView";
import {
  DEFAULT_UNLOADING_LAYOUT,
  type UnloadingLayout,
} from "@/game/unloading/layout";

/**
 * Pure layout helpers + scene mounts for static berth art (backdrop / gantry).
 * Does not touch physics colliders.
 */

export interface BerthBackdropLayout {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

/** Full-bleed plate covering the camera fit region (slightly oversized). */
export function computeBerthBackdropLayout(pad = 1.15): BerthBackdropLayout {
  return {
    centerX: worldToDisplayX(CAMERA_FOCUS_X),
    centerY: worldToDisplayY(CAMERA_FOCUS_Y),
    width: worldSizeToDisplay(DEMO_WORLD_WIDTH * pad),
    height: worldSizeToDisplay(DEMO_WORLD_HEIGHT * pad),
  };
}

export interface GantryLayout {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

/**
 * Static gantry art under the trolley rail only.
 * Must NOT stretch to the quay deck — that would cover ship/cradle as a wall.
 */
export function computeGantryLayout(
  layout: UnloadingLayout = DEFAULT_UNLOADING_LAYOUT,
): GantryLayout {
  const railY = layout.crane.railY;
  const deckTop = layout.quay.centerY - layout.quay.halfHeight;
  const minX = layout.crane.railMinX;
  const maxX = layout.crane.railMaxX;
  const width = maxX - minX;
  // Keep a short band just below the rail (not full air gap to the deck).
  const maxDrop = deckTop - railY;
  const height = Math.min(2.2, Math.max(1.0, maxDrop * 0.28));
  return {
    centerX: worldToDisplayX((minX + maxX) / 2),
    centerY: worldToDisplayY(railY + height / 2),
    width: worldSizeToDisplay(width),
    height: worldSizeToDisplay(height),
  };
}

export interface StaticBerthArtHandles {
  backdrop: Phaser.GameObjects.Image | null;
  gantry: Phaser.GameObjects.Image | null;
}

/**
 * Mount optional backdrop plate + gantry SVG when textures loaded.
 * Call after preload; missing textures leave nulls (greybox scenery remains).
 */
export function mountStaticBerthArt(
  scene: Phaser.Scene,
  textures: Phaser.Textures.TextureManager = scene.textures,
): StaticBerthArtHandles {
  const backdrop = mountIfTexture(
    scene,
    textures,
    UNLOADING_TEXTURE_KEYS.berthBackdrop,
    computeBerthBackdropLayout(),
    BERTH_BACKDROP_DEPTH,
  );

  const gantry = mountIfTexture(
    scene,
    textures,
    UNLOADING_TEXTURE_KEYS.craneGantry,
    computeGantryLayout(),
    // Behind moving trolley/spreader, above backdrop and water fills.
    3,
  );

  return { backdrop, gantry };
}

function mountIfTexture(
  scene: Phaser.Scene,
  textures: Phaser.Textures.TextureManager,
  key: UnloadingTextureKey,
  layout: { centerX: number; centerY: number; width: number; height: number },
  depth: number,
): Phaser.GameObjects.Image | null {
  if (!hasUsableTexture(textures, key)) {
    return null;
  }
  const image = scene.add.image(layout.centerX, layout.centerY, key);
  image.setOrigin(0.5, 0.5);
  image.setDisplaySize(layout.width, layout.height);
  image.setDepth(depth);
  return image;
}
