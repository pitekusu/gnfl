import { z } from "zod";

/**
 * Spreader–cask lock alignment tolerances (game units / radians / speeds).
 * Not real plant clearances — only for greybox feel.
 */
export const lockConfigSchema = z.object({
  /** Max |spreader.x − cask.x| to allow lock. */
  maxHorizontalError: z.number().positive(),
  /** Max vertical gap between spreader bottom and cask top (Y-down). */
  maxVerticalError: z.number().positive(),
  /** Max |angle spreader − cask| in radians. */
  maxAngleErrorRad: z.number().positive(),
  /** Max relative linear speed magnitude (game units / s). */
  maxRelativeSpeed: z.number().positive(),
  /** Max center-to-center distance (sanity cap). */
  maxCenterDistance: z.number().positive(),
  /**
   * How long (physics ticks) alignment must hold before Space can lock.
   * 0 = instantaneous edge check only.
   */
  stableAlignTicks: z.number().int().nonnegative(),
});

export type LockConfig = z.infer<typeof lockConfigSchema>;

export const DEFAULT_LOCK_CONFIG: LockConfig = lockConfigSchema.parse({
  maxHorizontalError: 0.55,
  maxVerticalError: 0.65,
  maxAngleErrorRad: 0.18,
  maxRelativeSpeed: 1.2,
  maxCenterDistance: 2.4,
  stableAlignTicks: 8,
});
