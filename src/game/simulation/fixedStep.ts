export interface FixedStepConfig {
  /** Seconds per physics tick (1/120 for GNFL). */
  dtSeconds: number;
  /** Maximum fixed steps applied for one wall-clock advance. */
  maxCatchUpTicks: number;
}

export interface FixedStepState {
  accumulatorSeconds: number;
  tick: number;
}

export interface FixedStepAdvanceResult {
  state: FixedStepState;
  /** Number of physics ticks that should run this frame. */
  steps: number;
  /** True when wall time jumped too far and accumulator was resynced. */
  resynced: boolean;
}

export function createFixedStepState(tick = 0): FixedStepState {
  return {
    accumulatorSeconds: 0,
    tick,
  };
}

/**
 * Accumulate wall-clock delta and decide how many fixed steps to run.
 * Does not assume the host timer fires exactly physicsHz times per second.
 */
export function advanceFixedStep(
  state: FixedStepState,
  elapsedSeconds: number,
  config: FixedStepConfig,
): FixedStepAdvanceResult {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) {
    return { state, steps: 0, resynced: false };
  }

  const next: FixedStepState = {
    accumulatorSeconds: state.accumulatorSeconds + elapsedSeconds,
    tick: state.tick,
  };

  let steps = Math.floor(next.accumulatorSeconds / config.dtSeconds);
  let resynced = false;

  if (steps > config.maxCatchUpTicks) {
    steps = config.maxCatchUpTicks;
    next.accumulatorSeconds = 0;
    resynced = true;
  } else {
    next.accumulatorSeconds -= steps * config.dtSeconds;
  }

  next.tick += steps;
  return { state: next, steps, resynced };
}

export function physicsDtSeconds(physicsHz: number): number {
  return 1 / physicsHz;
}
