import { describe, expect, it } from "vitest";
import {
  clampCableTargetLength,
  computeCableForce,
} from "@/game/unloading/cableForces";

describe("computeCableForce", () => {
  const base = {
    anchorA: { x: 0, y: 0 },
    anchorB: { x: 0, y: 3 },
    velocityA: { x: 0, y: 0 },
    velocityB: { x: 0, y: 0 },
    targetLength: 2,
    stiffness: 100,
    damping: 10,
    maxTension: 500,
  };

  it("produces upward tension on the spreader when stretched", () => {
    const result = computeCableForce(base);
    expect(result.slack).toBe(false);
    expect(result.tension).toBeCloseTo(100); // k * 1
    // B is below A (Y down); force on B pulls toward A (negative Y).
    expect(result.forceOnB.y).toBeLessThan(0);
    expect(result.forceOnB.x).toBeCloseTo(0);
  });

  it("produces no force when slack", () => {
    const result = computeCableForce({
      ...base,
      anchorB: { x: 0, y: 1 },
      targetLength: 2,
    });
    expect(result.slack).toBe(true);
    expect(result.tension).toBe(0);
    expect(result.forceOnB.x).toBe(0);
    expect(result.forceOnB.y).toBe(0);
  });

  it("clamps tension to maxTension", () => {
    const result = computeCableForce({
      ...base,
      anchorB: { x: 0, y: 20 },
      maxTension: 50,
    });
    expect(result.tension).toBe(50);
  });

  it("adds damping when the cable is lengthening", () => {
    const undamped = computeCableForce(base);
    const lengthening = computeCableForce({
      ...base,
      velocityB: { x: 0, y: 2 },
    });
    expect(lengthening.tension).toBeGreaterThan(undamped.tension);
  });
});

describe("clampCableTargetLength", () => {
  it("clamps into [min, max]", () => {
    expect(clampCableTargetLength(0.1, 0.8, 8)).toBe(0.8);
    expect(clampCableTargetLength(99, 0.8, 8)).toBe(8);
    expect(clampCableTargetLength(3, 0.8, 8)).toBe(3);
  });
});
