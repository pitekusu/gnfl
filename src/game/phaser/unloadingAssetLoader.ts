import type Phaser from "phaser";
import { listUnloadingSvgLoadEntries } from "@/game/phaser/unloadingAssetPaths";

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
