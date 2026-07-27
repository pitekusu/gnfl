import { describe, expect, it } from "vitest";
import { scaleSpeedForFineMode } from "@/game/unloading/fineMode";
import { integrateCableTargetLength } from "@/game/unloading/hoistMotion";
import { integrateTrolleyOnRail } from "@/game/unloading/trolleyMotion";

describe("scaleSpeedForFineMode", () => {
  it("returns full speed when fine mode is off", () => {
    expect(scaleSpeedForFineMode(4.5, false, 0.28)).toBe(4.5);
  });

  it("scales speed when fine mode is on", () => {
    expect(scaleSpeedForFineMode(4.5, true, 0.28)).toBeCloseTo(4.5 * 0.28);
  });
});

describe("fine mode on trolley and hoist", () => {
  it("moves the trolley less distance under fine mode", () => {
    const base = {
      x: 0,
      velocity: 0,
      dtSeconds: 1 / 120,
      maxSpeed: 4.5,
      acceleration: 100,
      axisDeadzone: 0.08,
      fineSpeedScale: 0.28,
      railMinX: -12,
      railMaxX: 12,
      trolleyHalfWidth: 0.9,
      axis: 1 as const,
    };
    let normal = { x: 0, velocity: 0 };
    let fine = { x: 0, velocity: 0 };
    for (let i = 0; i < 90; i += 1) {
      normal = integrateTrolleyOnRail({ ...base, ...normal, fineMode: false });
      fine = integrateTrolleyOnRail({ ...base, ...fine, fineMode: true });
    }
    expect(fine.x).toBeLessThan(normal.x * 0.5);
  });

  it("changes cable length more slowly under fine mode", () => {
    const base = {
      targetLength: 3,
      dtSeconds: 1 / 120,
      maxSpeed: 2.8,
      axisDeadzone: 0.08,
      fineSpeedScale: 0.28,
      minCableLength: 0.8,
      maxCableLength: 8.5,
      axis: 1 as const,
    };
    let normal = 3;
    let fine = 3;
    for (let i = 0; i < 90; i += 1) {
      normal = integrateCableTargetLength({
        ...base,
        targetLength: normal,
        fineMode: false,
      });
      fine = integrateCableTargetLength({
        ...base,
        targetLength: fine,
        fineMode: true,
      });
    }
    const normalDelta = 3 - normal;
    const fineDelta = 3 - fine;
    expect(fineDelta).toBeLessThan(normalDelta * 0.5);
  });
});
