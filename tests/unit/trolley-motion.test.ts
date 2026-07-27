import { describe, expect, it } from "vitest";
import {
  applyAxisDeadzone,
  integrateTrolleyOnRail,
} from "@/game/unloading/trolleyMotion";

describe("applyAxisDeadzone", () => {
  it("zeros values inside the deadzone", () => {
    expect(applyAxisDeadzone(0.05, 0.08)).toBe(0);
    expect(applyAxisDeadzone(-0.05, 0.08)).toBe(0);
  });

  it("rescales values outside the deadzone to full range", () => {
    expect(applyAxisDeadzone(1, 0.08)).toBeCloseTo(1);
    expect(applyAxisDeadzone(-1, 0.08)).toBeCloseTo(-1);
    expect(applyAxisDeadzone(0.08, 0.08)).toBe(0);
  });
});

describe("integrateTrolleyOnRail", () => {
  const base = {
    x: 0,
    velocity: 0,
    dtSeconds: 1 / 120,
    maxSpeed: 4.5,
    acceleration: 100,
    axisDeadzone: 0.08,
    fineMode: false,
    fineSpeedScale: 0.28,
    railMinX: -12,
    railMaxX: 12,
    trolleyHalfWidth: 0.9,
  };

  it("moves right under positive axis", () => {
    let state = { x: base.x, velocity: base.velocity };
    for (let i = 0; i < 120; i += 1) {
      state = integrateTrolleyOnRail({ ...base, ...state, axis: 1 });
    }
    expect(state.x).toBeGreaterThan(1);
  });

  it("clamps to the rail ends", () => {
    let state = { x: 11, velocity: 0 };
    for (let i = 0; i < 240; i += 1) {
      state = integrateTrolleyOnRail({ ...base, ...state, axis: 1 });
    }
    expect(state.x).toBeCloseTo(base.railMaxX - base.trolleyHalfWidth, 5);
    expect(state.velocity).toBe(0);
  });

  it("slows down in fine mode", () => {
    let normal = { x: 0, velocity: 0 };
    let fine = { x: 0, velocity: 0 };
    for (let i = 0; i < 60; i += 1) {
      normal = integrateTrolleyOnRail({ ...base, ...normal, axis: 1, fineMode: false });
      fine = integrateTrolleyOnRail({ ...base, ...fine, axis: 1, fineMode: true });
    }
    expect(fine.x).toBeLessThan(normal.x);
  });
});
