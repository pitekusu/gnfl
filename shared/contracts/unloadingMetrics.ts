import { z } from "zod";

/**
 * Unloading-stage metrics in **game units** (not real plant units).
 * Shared by the simulation client and (later) Lambda scoring path.
 *
 * All fields are finite and non-negative. Speeds/errors are stored as
 * magnitudes where the directive names them as errors or peaks.
 */
const nonNegFinite = z.number().finite().nonnegative();
const nonNegInt = z.number().int().nonnegative();

export const unloadingMetricsSchema = z.object({
  maximumSway: nonNegFinite,
  integratedSway: nonNegFinite,
  maximumCableLoad: nonNegFinite,
  highCableLoadTicks: nonNegInt,
  maximumCaskAcceleration: nonNegFinite,
  collisionImpulse: nonNegFinite,
  collisionCount: nonNegInt,
  landingPositionError: nonNegFinite,
  landingAngleError: nonNegFinite,
  landingVerticalSpeed: nonNegFinite,
  landingHorizontalSpeed: nonNegFinite,
  interlockCount: nonNegInt,
  elapsedTicks: nonNegInt,
});

export type UnloadingMetrics = z.infer<typeof unloadingMetricsSchema>;

export function createZeroUnloadingMetrics(): UnloadingMetrics {
  return unloadingMetricsSchema.parse({
    maximumSway: 0,
    integratedSway: 0,
    maximumCableLoad: 0,
    highCableLoadTicks: 0,
    maximumCaskAcceleration: 0,
    collisionImpulse: 0,
    collisionCount: 0,
    landingPositionError: 0,
    landingAngleError: 0,
    landingVerticalSpeed: 0,
    landingHorizontalSpeed: 0,
    interlockCount: 0,
    elapsedTicks: 0,
  });
}

/** Parse and reject non-finite / negative metrics (API / fixtures). */
export function parseUnloadingMetrics(input: unknown): UnloadingMetrics {
  return unloadingMetricsSchema.parse(input);
}
