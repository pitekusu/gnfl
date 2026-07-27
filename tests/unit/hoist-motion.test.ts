import { describe, expect, it } from "vitest";
import { integrateCableTargetLength } from "@/game/unloading/hoistMotion";

describe("integrateCableTargetLength", () => {
  const base = {
    targetLength: 3,
    dtSeconds: 1 / 120,
    maxSpeed: 2.8,
    axisDeadzone: 0.08,
    fineMode: false,
    fineSpeedScale: 0.28,
    minCableLength: 0.8,
    maxCableLength: 8.5,
  };

  it("shortens the cable on positive hoist axis (lift)", () => {
    let length = base.targetLength;
    for (let i = 0; i < 120; i += 1) {
      length = integrateCableTargetLength({ ...base, targetLength: length, axis: 1 });
    }
    expect(length).toBeLessThan(base.targetLength - 0.5);
  });

  it("lengthens the cable on negative hoist axis (lower)", () => {
    let length = base.targetLength;
    for (let i = 0; i < 120; i += 1) {
      length = integrateCableTargetLength({ ...base, targetLength: length, axis: -1 });
    }
    expect(length).toBeGreaterThan(base.targetLength + 0.5);
  });

  it("clamps to min and max cable length", () => {
    let length = base.targetLength;
    for (let i = 0; i < 600; i += 1) {
      length = integrateCableTargetLength({ ...base, targetLength: length, axis: 1 });
    }
    expect(length).toBe(base.minCableLength);

    for (let i = 0; i < 1200; i += 1) {
      length = integrateCableTargetLength({ ...base, targetLength: length, axis: -1 });
    }
    expect(length).toBe(base.maxCableLength);
  });

  it("moves slower in fine mode", () => {
    let normal = base.targetLength;
    let fine = base.targetLength;
    for (let i = 0; i < 60; i += 1) {
      normal = integrateCableTargetLength({
        ...base,
        targetLength: normal,
        axis: 1,
        fineMode: false,
      });
      fine = integrateCableTargetLength({
        ...base,
        targetLength: fine,
        axis: 1,
        fineMode: true,
      });
    }
    // Both shortened; fine shortened less.
    expect(fine).toBeGreaterThan(normal);
  });
});
