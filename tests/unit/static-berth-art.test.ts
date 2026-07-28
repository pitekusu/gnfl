import { describe, expect, it } from "vitest";
import {
  computeBerthBackdropLayout,
  computeGantryLayout,
} from "@/game/phaser/staticBerthArt";
import {
  CAMERA_FOCUS_X,
  DEMO_WORLD_WIDTH,
  worldSizeToDisplay,
  worldToDisplayX,
} from "@/game/phaser/worldView";
import { DEFAULT_UNLOADING_LAYOUT } from "@/game/unloading/layout";

describe("static berth art layout", () => {
  it("centers the backdrop on the camera focus", () => {
    const b = computeBerthBackdropLayout(1);
    expect(b.centerX).toBeCloseTo(worldToDisplayX(CAMERA_FOCUS_X));
    expect(b.width).toBeCloseTo(worldSizeToDisplay(DEMO_WORLD_WIDTH));
    expect(b.height).toBeGreaterThan(0);
  });

  it("spans the trolley rail but stays a short band under the rail", () => {
    const g = computeGantryLayout(DEFAULT_UNLOADING_LAYOUT);
    const railSpan =
      DEFAULT_UNLOADING_LAYOUT.crane.railMaxX - DEFAULT_UNLOADING_LAYOUT.crane.railMinX;
    const railY = DEFAULT_UNLOADING_LAYOUT.crane.railY;
    const deckTop =
      DEFAULT_UNLOADING_LAYOUT.quay.centerY - DEFAULT_UNLOADING_LAYOUT.quay.halfHeight;
    const fullDropPx = worldSizeToDisplay(deckTop - railY);
    expect(g.width).toBeCloseTo(worldSizeToDisplay(railSpan));
    expect(g.height).toBeGreaterThan(0);
    // Must not fill the entire air gap (that painted over the cradle).
    expect(g.height).toBeLessThan(fullDropPx * 0.5);
    expect(g.centerX).toBeCloseTo(
      worldToDisplayX(
        (DEFAULT_UNLOADING_LAYOUT.crane.railMinX +
          DEFAULT_UNLOADING_LAYOUT.crane.railMaxX) /
          2,
      ),
    );
  });
});
