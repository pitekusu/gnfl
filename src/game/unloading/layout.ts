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
  }),
  ship: z.object({
    /** Rest pose of ship kinematic body (before wave motion). */
    restCenterX: z.number(),
    restCenterY: z.number(),
    halfWidth: z.number().positive(),
    halfHeight: z.number().positive(),
    /** Hold floor relative to ship center. */
    holdFloorOffsetY: z.number().positive(),
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
    centerX: z.number(),
    centerY: z.number(),
    halfWidth: z.number().positive(),
    halfHeight: z.number().positive(),
  }),
});

export type UnloadingLayout = z.infer<typeof unloadingLayoutSchema>;

/**
 * Default side-view port layout:
 * ship (left) → quay deck → cradle (right under crane reach).
 */
export const DEFAULT_UNLOADING_LAYOUT: UnloadingLayout = unloadingLayoutSchema.parse({
  originX: 0,
  quay: {
    centerX: 4,
    centerY: 7,
    halfWidth: 14,
    halfHeight: 0.4,
  },
  ship: {
    restCenterX: -10,
    restCenterY: 6.2,
    halfWidth: 5.5,
    halfHeight: 2.2,
    holdFloorOffsetY: 1.4,
    holdHalfWidth: 2.4,
    holdWallHalfThickness: 0.2,
    holdWallHeight: 2.6,
  },
  crane: {
    railY: 0.5,
    railMinX: -12,
    railMaxX: 14,
    trolleyHalfWidth: 0.9,
    trolleyHalfHeight: 0.35,
    trolleyCableAttachHalfSpan: 0.55,
    spreaderHalfWidth: 0.85,
    spreaderHalfHeight: 0.3,
    spreaderCableAttachHalfSpan: 0.5,
    spreaderSpawnX: -10,
    spreaderSpawnY: 3.2,
  },
  cask: {
    halfWidth: 0.7,
    halfHeight: 1.1,
    spawnX: -10,
    spawnY: 5.5,
  },
  cradle: {
    centerX: 8,
    centerY: 6.35,
    halfWidth: 1.4,
    halfHeight: 0.35,
  },
});

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
  if (layout.cradle.centerX <= layout.quay.centerX - layout.quay.halfWidth * 0.25) {
    throw new Error("cradle should sit on the quay side of the scene");
  }
  if (layout.crane.spreaderSpawnY <= layout.crane.railY) {
    throw new Error("spreader spawn must hang below the rail");
  }
  if (layout.cask.spawnY <= layout.crane.spreaderSpawnY) {
    throw new Error("cask spawn should be below the initial spreader");
  }
}

assertUnloadingLayoutInvariants(DEFAULT_UNLOADING_LAYOUT);
