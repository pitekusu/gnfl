import { describe, expect, it, vi } from "vitest";
import type { Loader, Textures } from "phaser";
import {
  UNLOADING_SVG_RASTER_SIZE,
  hasUsableTexture,
  queueAllUnloadingArtLoads,
  queueUnloadingSvgLoads,
} from "@/game/phaser/unloadingAssetLoader";
import {
  UNLOADING_TEXTURE_KEYS,
  listUnloadingSvgLoadEntries,
  unloadingBackgroundUrl,
} from "@/game/phaser/unloadingAssetPaths";

describe("queueUnloadingSvgLoads", () => {
  it("queues every manifest entry via load.svg", () => {
    const svg = vi.fn();
    const load = { svg } as unknown as Loader.LoaderPlugin;
    queueUnloadingSvgLoads(load);
    expect(svg).toHaveBeenCalledTimes(listUnloadingSvgLoadEntries().length);
    const first = listUnloadingSvgLoadEntries()[0];
    expect(svg).toHaveBeenCalledWith(first?.key, first?.url, {
      width: UNLOADING_SVG_RASTER_SIZE,
      height: UNLOADING_SVG_RASTER_SIZE,
    });
  });

  it("also queues optional berth backdrop image", () => {
    const svg = vi.fn();
    const image = vi.fn();
    const load = { svg, image } as unknown as Loader.LoaderPlugin;
    queueAllUnloadingArtLoads(load);
    expect(image).toHaveBeenCalledWith(
      UNLOADING_TEXTURE_KEYS.berthBackdrop,
      unloadingBackgroundUrl("berthBackdrop"),
    );
  });
});

describe("hasUsableTexture", () => {
  it("rejects null and missing keys", () => {
    const textures = {
      exists: () => false,
      get: () => {
        throw new Error("missing");
      },
    } as unknown as Textures.TextureManager;
    expect(hasUsableTexture(textures, null)).toBe(false);
    expect(hasUsableTexture(textures, "nope")).toBe(false);
  });

  it("accepts textures with positive frame size", () => {
    const textures = {
      exists: () => true,
      get: () => ({
        get: () => ({ cutWidth: 64, cutHeight: 64 }),
      }),
    } as unknown as Textures.TextureManager;
    expect(hasUsableTexture(textures, "unloading-spreader")).toBe(true);
  });

  it("rejects zero-size frames", () => {
    const textures = {
      exists: () => true,
      get: () => ({
        get: () => ({ cutWidth: 0, cutHeight: 0 }),
      }),
    } as unknown as Textures.TextureManager;
    expect(hasUsableTexture(textures, "broken")).toBe(false);
  });
});
