import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  UNLOADING_ASSET_ROOT,
  UNLOADING_SVG_FILES,
  UNLOADING_TEXTURE_KEYS,
  listUnloadingSvgLoadEntries,
  textureKeyForSvgId,
  unloadingBackgroundUrl,
  unloadingSvgUrl,
} from "@/game/phaser/unloadingAssetPaths";

describe("unloadingAssetPaths", () => {
  it("keeps public root under /assets/unloading", () => {
    expect(UNLOADING_ASSET_ROOT).toBe("/assets/unloading");
  });

  it("builds svg urls from design-directive basenames", () => {
    expect(unloadingSvgUrl("transportCask")).toBe(
      "/assets/unloading/svg/transport_cask.svg",
    );
    expect(unloadingSvgUrl("shipBodyRear")).toBe(
      "/assets/unloading/svg/ship_body_rear.svg",
    );
    expect(UNLOADING_SVG_FILES.spreader).toBe("spreader.svg");
  });

  it("maps every svg id to a stable texture key", () => {
    for (const id of Object.keys(UNLOADING_SVG_FILES) as Array<
      keyof typeof UNLOADING_SVG_FILES
    >) {
      const key = textureKeyForSvgId(id);
      expect(key.startsWith("unloading-")).toBe(true);
      expect(Object.values(UNLOADING_TEXTURE_KEYS)).toContain(key);
    }
  });

  it("lists load entries with matching key and url", () => {
    const entries = listUnloadingSvgLoadEntries();
    expect(entries.length).toBe(Object.keys(UNLOADING_SVG_FILES).length);
    for (const e of entries) {
      expect(e.url).toBe(unloadingSvgUrl(e.id));
      expect(e.key).toBe(textureKeyForSvgId(e.id));
    }
  });

  it("points backdrop at backgrounds dir", () => {
    expect(unloadingBackgroundUrl("berthBackdrop")).toBe(
      "/assets/unloading/backgrounds/berth_backdrop.webp",
    );
  });

  it("ships minimal industrial SVG files under public/", () => {
    const svgDir = path.resolve(process.cwd(), "public/assets/unloading/svg");
    for (const file of Object.values(UNLOADING_SVG_FILES)) {
      expect(existsSync(path.join(svgDir, file)), file).toBe(true);
    }
  });
});
