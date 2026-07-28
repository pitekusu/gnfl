import { describe, expect, it } from "vitest";
import {
  CABLE_DRAW_DEPTH,
  SHIP_HOLD_FOREGROUND_DEPTH,
  entityKindsWithTextures,
  prefersTexturedDisplay,
  resolveEntityDisplay,
} from "@/game/phaser/entityDisplayRegistry";
import { UNLOADING_TEXTURE_KEYS } from "@/game/phaser/unloadingAssetPaths";

describe("entityDisplayRegistry", () => {
  it("maps snapshot kinds to stable depths and center origins", () => {
    const cask = resolveEntityDisplay("cask");
    expect(cask.depth).toBe(14);
    expect(cask.originX).toBe(0.5);
    expect(cask.originY).toBe(0.5);
    expect(cask.textureKey).toBe(UNLOADING_TEXTURE_KEYS.transportCask);

    const ship = resolveEntityDisplay("ship");
    expect(ship.depth).toBe(8);
    expect(ship.fillAlpha).toBeLessThan(1);
    expect(ship.textureKey).toBe(UNLOADING_TEXTURE_KEYS.shipBodyRear);
    expect(ship.overlayTextureKey).toBe(UNLOADING_TEXTURE_KEYS.shipHoldForeground);
    expect(SHIP_HOLD_FOREGROUND_DEPTH).toBeGreaterThan(ship.depth);
    expect(SHIP_HOLD_FOREGROUND_DEPTH).toBeGreaterThan(cask.depth);
  });

  it("keeps crane parts above the cask and cables above the spreader", () => {
    const trolley = resolveEntityDisplay("trolley");
    const spreader = resolveEntityDisplay("spreader");
    const cask = resolveEntityDisplay("cask");
    expect(trolley.depth).toBeGreaterThan(cask.depth);
    expect(spreader.depth).toBeGreaterThan(cask.depth);
    expect(CABLE_DRAW_DEPTH).toBeGreaterThan(spreader.depth);
  });

  it("lists only kinds that have a primary texture key", () => {
    const kinds = entityKindsWithTextures();
    expect(kinds).toEqual(
      expect.arrayContaining(["ship", "cask", "trolley", "spreader", "cradle"]),
    );
    expect(kinds).not.toContain("quay");
    expect(prefersTexturedDisplay("cask")).toBe(true);
    expect(prefersTexturedDisplay("quay")).toBe(false);
  });

  it("falls back to unknown for unexpected kinds at runtime", () => {
    // Cast: registry accepts EntityKind; unknown is the safety entry.
    const cfg = resolveEntityDisplay("unknown");
    expect(cfg.textureKey).toBeNull();
    expect(cfg.fillColor).toBeGreaterThan(0);
  });
});
