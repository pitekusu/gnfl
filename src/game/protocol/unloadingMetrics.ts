/** Game-unit metrics; not real plant units. */
export interface UnloadingMetrics {
  maximumSway: number;
  integratedSway: number;
  maximumCableLoad: number;
  highCableLoadTicks: number;
  maximumCaskAcceleration: number;
  collisionImpulse: number;
  collisionCount: number;
  landingPositionError: number;
  landingAngleError: number;
  landingVerticalSpeed: number;
  landingHorizontalSpeed: number;
  interlockCount: number;
  elapsedTicks: number;
}

export function createZeroUnloadingMetrics(): UnloadingMetrics {
  return {
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
  };
}
