import { describe, expect, it } from "vitest";
import {
  advanceFixedStep,
  createFixedStepState,
  physicsDtSeconds,
} from "@/game/simulation/fixedStep";

const config = {
  dtSeconds: physicsDtSeconds(120),
  maxCatchUpTicks: 8,
};

describe("fixed step loop", () => {
  it("uses 1/120 second ticks", () => {
    expect(physicsDtSeconds(120)).toBeCloseTo(1 / 120, 10);
  });

  it("does not step when elapsed is zero or negative", () => {
    const state = createFixedStepState();
    expect(advanceFixedStep(state, 0, config).steps).toBe(0);
    expect(advanceFixedStep(state, -0.1, config).steps).toBe(0);
  });

  it("accumulates small deltas into whole ticks", () => {
    let state = createFixedStepState();
    const half = config.dtSeconds / 2;

    const first = advanceFixedStep(state, half, config);
    expect(first.steps).toBe(0);
    state = first.state;

    const second = advanceFixedStep(state, half, config);
    expect(second.steps).toBe(1);
    expect(second.state.tick).toBe(1);
  });

  it("caps catch-up and resyncs on large time jumps", () => {
    const state = createFixedStepState();
    const result = advanceFixedStep(state, 2, config);

    expect(result.steps).toBe(config.maxCatchUpTicks);
    expect(result.resynced).toBe(true);
    expect(result.state.accumulatorSeconds).toBe(0);
    expect(result.state.tick).toBe(config.maxCatchUpTicks);
  });

  it("keeps remainder under one dt after normal catch-up", () => {
    const state = createFixedStepState();
    const elapsed = config.dtSeconds * 3.25;
    const result = advanceFixedStep(state, elapsed, config);

    expect(result.steps).toBe(3);
    expect(result.resynced).toBe(false);
    expect(result.state.accumulatorSeconds).toBeCloseTo(config.dtSeconds * 0.25, 10);
  });
});
