import { z } from "zod";

/**
 * Tunable crane / cable parameters (game units).
 * Springs are not real wire models — values exist only for feel.
 */
export const cranePhysicsConfigSchema = z.object({
  trolley: z.object({
    /** Max horizontal speed at full axis input (units / s). */
    maxSpeed: z.number().positive(),
    /** Axis deadzone before motion starts. */
    axisDeadzone: z.number().nonnegative().max(0.5),
    /** How quickly commanded velocity tracks input (1/s-ish). */
    acceleration: z.number().positive(),
  }),
  hoist: z.object({
    /** Max cable length change rate at full axis (units / s). */
    maxSpeed: z.number().positive(),
    minCableLength: z.number().positive(),
    maxCableLength: z.number().positive(),
    /** Initial rest length when the stage starts. */
    initialCableLength: z.number().positive(),
  }),
  fineMode: z.object({
    /** Multiplier applied to trolley and hoist max speeds when fineMode is on. */
    speedScale: z.number().positive().max(1),
  }),
  cable: z.object({
    /** Spring stiffness for tension (game units). */
    stiffness: z.number().positive(),
    /** Linear damping along cable direction. */
    damping: z.number().nonnegative(),
    /** Clamp on tensile force magnitude. */
    maxTension: z.number().positive(),
  }),
  spreader: z.object({
    linearDamping: z.number().nonnegative(),
    angularDamping: z.number().nonnegative(),
  }),
  cask: z.object({
    linearDamping: z.number().nonnegative(),
    angularDamping: z.number().nonnegative(),
  }),
});

export type CranePhysicsConfig = z.infer<typeof cranePhysicsConfigSchema>;

export const DEFAULT_CRANE_PHYSICS_CONFIG: CranePhysicsConfig =
  cranePhysicsConfigSchema.parse({
    trolley: {
      maxSpeed: 4.5,
      axisDeadzone: 0.08,
      acceleration: 12,
    },
    hoist: {
      maxSpeed: 2.8,
      minCableLength: 0.8,
      maxCableLength: 8.5,
      initialCableLength: 2.6,
    },
    fineMode: {
      speedScale: 0.28,
    },
    cable: {
      stiffness: 420,
      damping: 28,
      maxTension: 900,
    },
    spreader: {
      linearDamping: 0.15,
      angularDamping: 0.4,
    },
    cask: {
      linearDamping: 0.2,
      angularDamping: 0.5,
    },
  });

export function assertCranePhysicsConfigInvariants(config: CranePhysicsConfig): void {
  if (config.hoist.minCableLength >= config.hoist.maxCableLength) {
    throw new Error("hoist.minCableLength must be < maxCableLength");
  }
  if (
    config.hoist.initialCableLength < config.hoist.minCableLength ||
    config.hoist.initialCableLength > config.hoist.maxCableLength
  ) {
    throw new Error("hoist.initialCableLength must be within min/max cable length");
  }
}

assertCranePhysicsConfigInvariants(DEFAULT_CRANE_PHYSICS_CONFIG);
