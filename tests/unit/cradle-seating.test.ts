import { describe, expect, it } from "vitest";
import { evaluateCradleSeating } from "@/game/unloading/cradleSeating";
import { DEFAULT_INTERLOCK_CONFIG } from "@/game/unloading/interlockConfig";
import { DEFAULT_UNLOADING_LAYOUT } from "@/game/unloading/layout";
import { cradleTopY } from "@/game/unloading/stageThresholds";

const halfC = DEFAULT_UNLOADING_LAYOUT.cask.halfHeight;
const cradleX = DEFAULT_UNLOADING_LAYOUT.cradle.centerX;
const topY = cradleTopY();

describe("evaluateCradleSeating", () => {
  it("accepts a settled cask on the cradle pad", () => {
    // Bottom on cradle top: centerY = topY - halfHeight (Y-down: bottom = y + half).
    const caskY = topY - halfC;
    const result = evaluateCradleSeating({
      cask: { x: cradleX, y: caskY, angleRad: 0, vx: 0, vy: 0 },
      caskHalfHeight: halfC,
      cradleCenterX: cradleX,
      cradleTopY: topY,
      interlock: DEFAULT_INTERLOCK_CONFIG,
    });
    expect(result.ok).toBe(true);
    expect(result.reasons).toEqual([]);
    expect(result.gapAboveCradle).toBeCloseTo(0, 5);
  });

  it("rejects large horizontal offset", () => {
    const caskY = topY - halfC;
    const result = evaluateCradleSeating({
      cask: {
        x: cradleX + DEFAULT_INTERLOCK_CONFIG.seatMaxHorizontalError + 0.5,
        y: caskY,
        angleRad: 0,
        vx: 0,
        vy: 0,
      },
      caskHalfHeight: halfC,
      cradleCenterX: cradleX,
      cradleTopY: topY,
      interlock: DEFAULT_INTERLOCK_CONFIG,
    });
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("horizontal");
  });

  it("rejects floating high above the pad", () => {
    const caskY = topY - halfC - 2;
    const result = evaluateCradleSeating({
      cask: { x: cradleX, y: caskY, angleRad: 0, vx: 0, vy: 0 },
      caskHalfHeight: halfC,
      cradleCenterX: cradleX,
      cradleTopY: topY,
      interlock: DEFAULT_INTERLOCK_CONFIG,
    });
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("vertical");
  });

  it("rejects high seating speed", () => {
    const caskY = topY - halfC;
    const result = evaluateCradleSeating({
      cask: { x: cradleX, y: caskY, angleRad: 0, vx: 0, vy: 3 },
      caskHalfHeight: halfC,
      cradleCenterX: cradleX,
      cradleTopY: topY,
      interlock: DEFAULT_INTERLOCK_CONFIG,
    });
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("speed");
  });
});
