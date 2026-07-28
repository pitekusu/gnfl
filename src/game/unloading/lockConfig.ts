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
  /** Tight enough that a visible air gap above the cask rejects lock. */
  maxHorizontalError: 0.35,
  /**
   * Face-gap budget (game units). Spreader half-height is ~0.3 — keep this
   * well below so "not touching" cannot read as lockReady.
   */
  maxVerticalError: 0.12,
  maxAngleErrorRad: 0.14,
  maxRelativeSpeed: 0.9,
  /** ~ spreaderHalf + caskHalf + small margin when faces nearly touch. */
  maxCenterDistance: 1.65,
  stableAlignTicks: 10,
});
