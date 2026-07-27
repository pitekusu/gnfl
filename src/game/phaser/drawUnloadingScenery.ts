import type Phaser from "phaser";
import type { RenderEntityState, RenderSnapshot } from "@/game/protocol";
import {
  worldSizeToDisplay,
  worldToDisplayX,
  worldToDisplayY,
} from "@/game/phaser/worldView";
import { DEFAULT_UNLOADING_LAYOUT } from "@/game/unloading/layout";

/**
 * Static berth backdrop + gantry rail (layout-driven, not physics).
 */
export function drawStaticUnloadingScenery(g: Phaser.GameObjects.Graphics): void {
  const layout = DEFAULT_UNLOADING_LAYOUT;
  g.clear();

  // Deep water band under the quay / berth.
  const waterTop = worldToDisplayY(layout.quay.centerY + layout.quay.halfHeight);
  const waterBottom = worldToDisplayY(layout.quay.centerY + 6);
  g.fillStyle(0x0c2438, 1);
  g.fillRect(
    worldToDisplayX(-24),
    waterTop,
    worldSizeToDisplay(48),
    waterBottom - waterTop,
  );

  // Lighter sea surface near the waterline.
  g.fillStyle(0x143650, 0.85);
  g.fillRect(
    worldToDisplayX(-24),
    waterTop,
    worldSizeToDisplay(48),
    worldSizeToDisplay(0.7),
  );

  // Crane rail (full trolley travel).
  const railY = worldToDisplayY(layout.crane.railY);
  g.lineStyle(4, 0x8a9bab, 1);
  g.beginPath();
  g.moveTo(worldToDisplayX(layout.crane.railMinX), railY);
  g.lineTo(worldToDisplayX(layout.crane.railMaxX), railY);
  g.strokePath();

  // Simple gantry uprights at rail ends.
  g.lineStyle(5, 0x6a7d8c, 1);
  for (const x of [layout.crane.railMinX + 0.5, layout.crane.railMaxX - 0.5]) {
    const dx = worldToDisplayX(x);
    g.beginPath();
    g.moveTo(dx, railY);
    g.lineTo(dx, worldToDisplayY(layout.quay.centerY + layout.quay.halfHeight));
    g.strokePath();
  }
}

/**
 * Dynamic overlays that follow snapshot entities (hold floor under the ship).
 */
export function drawDynamicUnloadingOverlays(
  g: Phaser.GameObjects.Graphics,
  snapshot: RenderSnapshot,
): void {
  const layout = DEFAULT_UNLOADING_LAYOUT;
  const ship = snapshot.entities.find((e) => e.kind === "ship");
  if (!ship) {
    return;
  }

  // Hold floor band in ship-local space, rotated with the hull.
  const localY = layout.ship.holdFloorOffsetY;
  const halfW = layout.ship.holdHalfWidth;
  const left = rotateOffset(ship, -halfW, localY);
  const right = rotateOffset(ship, halfW, localY);

  g.lineStyle(3, 0xc4d6e4, 0.9);
  g.beginPath();
  g.moveTo(worldToDisplayX(left.x), worldToDisplayY(left.y));
  g.lineTo(worldToDisplayX(right.x), worldToDisplayY(right.y));
  g.strokePath();

  // Hold wall ticks (left / right).
  const wallTop = -layout.ship.holdWallHeight * 0.15;
  for (const side of [-1, 1] as const) {
    const top = rotateOffset(ship, side * halfW, localY + wallTop);
    const bot = rotateOffset(ship, side * halfW, localY);
    g.lineStyle(2, 0x9eb4c4, 0.75);
    g.beginPath();
    g.moveTo(worldToDisplayX(top.x), worldToDisplayY(top.y));
    g.lineTo(worldToDisplayX(bot.x), worldToDisplayY(bot.y));
    g.strokePath();
  }
}

function rotateOffset(
  ship: RenderEntityState,
  localX: number,
  localY: number,
): { x: number; y: number } {
  const cos = Math.cos(ship.angleRad);
  const sin = Math.sin(ship.angleRad);
  return {
    x: ship.x + localX * cos - localY * sin,
    y: ship.y + localX * sin + localY * cos,
  };
}
