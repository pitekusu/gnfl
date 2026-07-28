import { z } from "zod";

/**
 * Static greybox layout for the unloading stage (game units, Y down).
 * Not real plant dimensions — only for feel and collider placement.
 */
export const unloadingLayoutSchema = z.object({
  /** World origin reference; camera focus tends near mid-scene. */
  originX: z.number(),
  quay: z.object({
    centerX: z.number(),
    /** Top surface of the quay deck (body center for a box collider). */
    centerY: z.number(),
    halfWidth: z.number().positive(),
    halfHeight: z.number().positive(),
    /**
     * Water-side vertical bumper on the quay body (local).
     * Must be drawn in scenery — physics-only boxes feel like ghost hitboxes.
     */
    bumperHalfWidth: z.number().positive(),
    bumperHalfHeight: z.number().positive(),
  }),
  ship: z.object({
    /** Rest pose of ship kinematic body (before wave motion). */
    restCenterX: z.number(),
    restCenterY: z.number(),
    halfWidth: z.number().positive(),
    halfHeight: z.number().positive(),
    /** Hold floor relative to ship center. */
    holdFloorOffsetY: z.number().positive(),
    /** Half-thickness of the hold floor slab collider (also drawn). */
    holdFloorHalfHeight: z.number().positive(),
    holdHalfWidth: z.number().positive(),
    holdWallHalfThickness: z.number().positive(),
    holdWallHeight: z.number().positive(),
  }),
  crane: z.object({
    /** Fixed gantry rail height (trolley Y). */
    railY: z.number(),
    railMinX: z.number(),
    railMaxX: z.number(),
    trolleyHalfWidth: z.number().positive(),
    trolleyHalfHeight: z.number().positive(),
    /** Horizontal offset of left/right cable attach points on the trolley. */
    trolleyCableAttachHalfSpan: z.number().positive(),
    spreaderHalfWidth: z.number().positive(),
    spreaderHalfHeight: z.number().positive(),
    spreaderCableAttachHalfSpan: z.number().positive(),
    /** Initial spreader center when the stage starts. */
    spreaderSpawnX: z.number(),
    spreaderSpawnY: z.number(),
  }),
  cask: z.object({
    halfWidth: z.number().positive(),
    halfHeight: z.number().positive(),
    /** Initial free cask pose inside the hold (pre-lock). */
    spawnX: z.number(),
    spawnY: z.number(),
  }),
  cradle: z.object({
    /** Pad center (body origin). */
    centerX: z.number(),
    centerY: z.number(),
    /** Horizontal half-extent of the pad. */
    halfWidth: z.number().positive(),
    /** Vertical half-extent of the pad slab. */
    halfHeight: z.number().positive(),
    /** U-jaw posts on left/right of the pad (same body). */
    postHalfWidth: z.number().positive(),
    postHalfHeight: z.number().positive(),
  }),
});

export type UnloadingLayout = z.infer<typeof unloadingLayoutSchema>;

/**
 * Default side-view port layout:
 * ship (left, in berth) → water gap → quay deck → cradle (right).
 *
 * Keep ship AABB fully left of the quay left edge so greyboxes do not overlap.
 */
export const DEFAULT_UNLOADING_LAYOUT: UnloadingLayout = unloadingLayoutSchema.parse({
  originX: 0,
  // Compact berth: ship | gap | quay — tight enough that the hull fills the view.
  quay: {
    // Deck from x≈-1.5 to x≈14.5
    centerX: 6.5,
    centerY: 6.8,
    halfWidth: 8,
    halfHeight: 0.45,
    bumperHalfWidth: 0.25,
    bumperHalfHeight: 0.9,
  },
  ship: {
    // Hull from x≈-14 to x≈-5 — water gap ≥1.5 before quay left edge.
    restCenterX: -9.5,
    restCenterY: 6.5,
    halfWidth: 4.5,
    halfHeight: 2.1,
    holdFloorOffsetY: 1.2,
    holdFloorHalfHeight: 0.15,
    holdHalfWidth: 2.1,
    holdWallHalfThickness: 0.2,
    holdWallHeight: 2.5,
  },
  crane: {
    railY: 0.35,
    railMinX: -15,
    railMaxX: 14,
    trolleyHalfWidth: 0.9,
    trolleyHalfHeight: 0.35,
    trolleyCableAttachHalfSpan: 0.55,
    spreaderHalfWidth: 0.85,
    spreaderHalfHeight: 0.3,
    spreaderCableAttachHalfSpan: 0.5,
    // Start over the quay (not over the ship hold) so the run begins at the berth.
    spreaderSpawnX: 4,
    spreaderSpawnY: 2.8,
  },
  cask: {
    halfWidth: 0.7,
    halfHeight: 1.1,
    // World spawn inside the hold mouth; settles onto the hold floor under gravity.
    spawnX: -9.5,
    spawnY: 6.2,
  },
  cradle: {
    // Pad sits on the quay deck top (centerY = deckTop + padHalfHeight).
    centerX: 9,
    centerY: 6.8 - 0.45 + 0.2,
    halfWidth: 1.5,
    halfHeight: 0.2,
    postHalfWidth: 0.22,
    postHalfHeight: 0.55,
  },
});

/** Ship hull right edge (rest pose, no wave). */
export function shipRestRightX(layout: UnloadingLayout): number {
  return layout.ship.restCenterX + layout.ship.halfWidth;
}

/** Quay deck left edge. */
export function quayLeftX(layout: UnloadingLayout): number {
  return layout.quay.centerX - layout.quay.halfWidth;
}

/** Invariants used by tests and future world builders. */
export function assertUnloadingLayoutInvariants(layout: UnloadingLayout): void {
  if (layout.crane.railMinX >= layout.crane.railMaxX) {
    throw new Error("crane.railMinX must be < railMaxX");
  }
  if (layout.crane.railY >= layout.quay.centerY) {
    throw new Error("crane rail must be above the quay deck");
  }
  if (layout.ship.restCenterX >= layout.quay.centerX) {
    throw new Error("ship rest pose should sit left of quay center (side view)");
  }

  // Horizontal clearance: ship hull must not overlap the quay slab.
  const gap = quayLeftX(layout) - shipRestRightX(layout);
  if (gap < 1.5) {
    throw new Error(
      `ship/quay horizontal gap must be >= 1.5 game units (got ${gap.toFixed(2)})`,
    );
  }

  if (
    layout.cradle.centerX < layout.quay.centerX - layout.quay.halfWidth ||
    layout.cradle.centerX > layout.quay.centerX + layout.quay.halfWidth
  ) {
    throw new Error("cradle must sit within the quay horizontal span");
  }
  if (layout.crane.spreaderSpawnY <= layout.crane.railY) {
    throw new Error("spreader spawn must hang below the rail");
  }
  if (layout.cask.spawnY <= layout.crane.spreaderSpawnY) {
    throw new Error("cask spawn should be below the initial spreader");
  }
  // Crane starts on the quay side of the water gap (not parked over the ship).
  if (layout.crane.spreaderSpawnX < quayLeftX(layout)) {
    throw new Error("spreader spawn should start over the quay, not over the berth");
  }
}

assertUnloadingLayoutInvariants(DEFAULT_UNLOADING_LAYOUT);
