import type Phaser from "phaser";
import {
  UNLOADING_TEXTURE_KEYS,
  listUnloadingSvgLoadEntries,
  unloadingBackgroundUrl,
} from "@/game/phaser/unloadingAssetPaths";

/** Default SVG raster size for Phaser (display scale is set per entity). */
export const UNLOADING_SVG_RASTER_SIZE = 256;

/**
 * Queue unloading SVG files on a Phaser loader.
 * Call from Scene.preload(); missing files must not crash the scene (loader errors).
 */
export function queueUnloadingSvgLoads(load: Phaser.Loader.LoaderPlugin): void {
  for (const entry of listUnloadingSvgLoadEntries()) {
    load.svg(entry.key, entry.url, {
      width: UNLOADING_SVG_RASTER_SIZE,
      height: UNLOADING_SVG_RASTER_SIZE,
    });
  }
}

/**
 * Optional full-bleed berth plate (WebP/PNG). 404 is OK — greybox water/sky remain.
 */
export function queueUnloadingBackgroundLoads(load: Phaser.Loader.LoaderPlugin): void {
  load.image(
    UNLOADING_TEXTURE_KEYS.berthBackdrop,
    unloadingBackgroundUrl("berthBackdrop"),
  );
}

/** Queue all unloading display assets for Scene.preload(). */
export function queueAllUnloadingArtLoads(load: Phaser.Loader.LoaderPlugin): void {
  queueUnloadingSvgLoads(load);
  queueUnloadingBackgroundLoads(load);
}

/** True when the texture manager has a successful non-missing texture for the key. */
export function hasUsableTexture(
  textures: Phaser.Textures.TextureManager,
  key: string | null | undefined,
): boolean {
  if (key == null || key === "") {
    return false;
  }
  if (!textures.exists(key)) {
    return false;
  }
  // Phaser may register a broken texture; require a frame with positive size.
  try {
    const tex = textures.get(key);
    const frame = tex.get();
    return frame.cutWidth > 0 && frame.cutHeight > 0;
  } catch {
    return false;
  }
}
