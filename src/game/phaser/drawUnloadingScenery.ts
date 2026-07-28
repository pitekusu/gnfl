import type Phaser from "phaser";
import type { RenderEntityState, RenderSnapshot } from "@/game/protocol";
import {
  worldSizeToDisplay,
  worldToDisplayX,
  worldToDisplayY,
} from "@/game/phaser/worldView";
import { DEFAULT_UNLOADING_LAYOUT } from "@/game/unloading/layout";

/**
 * Static berth backdrop + gantry rail + colliders that are not snapshot entities
 * (quay bumper, cradle U-posts). Dimensions must match scaffoldWorld colliders.
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

  // Quay water-side bumper (physics collider on quay body — was invisible).
  const bumperLocalX = -layout.quay.halfWidth + layout.quay.bumperHalfWidth;
  const bumperLocalY = -layout.quay.halfHeight - layout.quay.bumperHalfHeight;
  const bumperWorldX = layout.quay.centerX + bumperLocalX;
  const bumperWorldY = layout.quay.centerY + bumperLocalY;
  fillWorldRect(
    g,
    bumperWorldX,
    bumperWorldY,
    layout.quay.bumperHalfWidth * 2,
    layout.quay.bumperHalfHeight * 2,
    0x4a5f70,
    0x9eb4c4,
  );

  // Cradle U-posts (pad itself is the cradle snapshot entity).
  const postLocalY = -layout.cradle.halfHeight - layout.cradle.postHalfHeight;
  const postInsetX = layout.cradle.halfWidth - layout.cradle.postHalfWidth;
  for (const side of [-1, 1] as const) {
    fillWorldRect(
      g,
      layout.cradle.centerX + side * postInsetX,
      layout.cradle.centerY + postLocalY,
      layout.cradle.postHalfWidth * 2,
      layout.cradle.postHalfHeight * 2,
      0x5a4632,
      0xc4a574,
    );
  }
}

/**
 * Dynamic overlays that follow snapshot entities (hold floor / walls under the ship).
 * Drawn as filled slabs matching Rapier colliders — not thin decorative lines.
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

  const floorY = layout.ship.holdFloorOffsetY;
  const halfW = layout.ship.holdHalfWidth;
  const floorHalfH = layout.ship.holdFloorHalfHeight;
  const wallHalfT = layout.ship.holdWallHalfThickness;
  const wallHalfH = layout.ship.holdWallHeight / 2;
  const wallLocalY = floorY - wallHalfH;

  // Hold floor slab.
  fillOrientedWorldRect(
    g,
    ship,
    0,
    floorY,
    halfW * 2,
    floorHalfH * 2,
    0xb8c8d4,
    0xe0ecf4,
  );

  // Hold walls (full collider height).
  for (const side of [-1, 1] as const) {
    fillOrientedWorldRect(
      g,
      ship,
      side * halfW,
      wallLocalY,
      wallHalfT * 2,
      wallHalfH * 2,
      0x8fa6b8,
      0xc4d6e4,
    );
  }
}

function fillWorldRect(
  g: Phaser.GameObjects.Graphics,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  fill: number,
  stroke: number,
): void {
  const x = worldToDisplayX(centerX - width / 2);
  const y = worldToDisplayY(centerY - height / 2);
  const w = worldSizeToDisplay(width);
  const h = worldSizeToDisplay(height);
  g.fillStyle(fill, 1);
  g.fillRect(x, y, w, h);
  g.lineStyle(2, stroke, 1);
  g.strokeRect(x, y, w, h);
}

function fillOrientedWorldRect(
  g: Phaser.GameObjects.Graphics,
  ship: RenderEntityState,
  localX: number,
  localY: number,
  width: number,
  height: number,
  fill: number,
  stroke: number,
): void {
  const hw = width / 2;
  const hh = height / 2;
  const corners = [
    rotateOffset(ship, localX - hw, localY - hh),
    rotateOffset(ship, localX + hw, localY - hh),
    rotateOffset(ship, localX + hw, localY + hh),
    rotateOffset(ship, localX - hw, localY + hh),
  ];
  g.fillStyle(fill, 0.95);
  g.lineStyle(2, stroke, 1);
  g.beginPath();
  g.moveTo(worldToDisplayX(corners[0]!.x), worldToDisplayY(corners[0]!.y));
  for (let i = 1; i < corners.length; i += 1) {
    g.lineTo(worldToDisplayX(corners[i]!.x), worldToDisplayY(corners[i]!.y));
  }
  g.closePath();
  g.fillPath();
  g.strokePath();
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
