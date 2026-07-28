import { z } from "zod";

/**
 * Safety interlock thresholds for the unloading stage (game units).
 * Interlock trips are score penalties later — not accident cutscenes.
 */
export const interlockConfigSchema = z.object({
  /**
   * Without lock, hoist-up is limited to this fraction of normal max speed.
   * 0 = fully blocked (preferred for Phase 3 ground-break interlock).
   */
  unlockedHoistUpSpeedScale: z.number().nonnegative().max(1),
  /**
   * While cask bottom is below clear-of-hold height, trolley max speed scale.
   * Full speed only after CLEAR_OF_HOLD.
   */
  lowClearanceTrolleySpeedScale: z.number().positive().max(1),
  /**
   * World Y (down) of cask center above which the load is "clear of hold"
   * relative to the ship's rest hold mouth (refined when wired to ship pose).
   * Extra margin above hold wall top for greybox.
   */
  clearOfHoldMargin: z.number().nonnegative(),
  /** Cable tension above which hoist-up is cut. */
  maxHoistTension: z.number().positive(),
  /** Absolute world bounds for safe play (outside → SAFE_ABORT). */
  worldBounds: z.object({
    minX: z.number(),
    maxX: z.number(),
    minY: z.number(),
    maxY: z.number(),
  }),
  /** Speed magnitude that counts as physics runaway (SAFE_ABORT). */
  maxBodySpeed: z.number().positive(),
  /**
   * Cradle seating: how many consecutive ticks of "stable on cradle"
   * before SEATED is accepted.
   */
  seatStableTicks: z.number().int().positive(),
  /** Max |horizontal| seat position error for SEATED. */
  seatMaxHorizontalError: z.number().positive(),
  /** Max vertical distance above cradle top for "on seat". */
  seatMaxVerticalError: z.number().positive(),
  /** Max |angle| on seat (rad). */
  seatMaxAngleErrorRad: z.number().positive(),
  /** Max seating contact speed (units / s). */
  seatMaxSpeed: z.number().positive(),
});

export type InterlockConfig = z.infer<typeof interlockConfigSchema>;

export const DEFAULT_INTERLOCK_CONFIG: InterlockConfig = interlockConfigSchema.parse({
  unlockedHoistUpSpeedScale: 0,
  lowClearanceTrolleySpeedScale: 0.22,
  clearOfHoldMargin: 0.4,
  maxHoistTension: 720,
  worldBounds: {
    minX: -28,
    maxX: 24,
    minY: -4,
    maxY: 16,
  },
  maxBodySpeed: 28,
  seatStableTicks: 36,
  seatMaxHorizontalError: 0.7,
  seatMaxVerticalError: 0.55,
  seatMaxAngleErrorRad: 0.2,
  seatMaxSpeed: 0.85,
});
