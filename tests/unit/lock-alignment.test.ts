import { describe, expect, it } from "vitest";
import { DEFAULT_LOCK_CONFIG } from "@/game/unloading/lockConfig";
import { evaluateLockAlignment } from "@/game/unloading/lockAlignment";

const halfS = 0.3;
const halfC = 1.1;

describe("evaluateLockAlignment", () => {
  it("accepts a well-centered slow pair", () => {
    const caskY = 6;
    const idealSpreaderY = caskY - halfC - halfS;
    const result = evaluateLockAlignment({
      spreader: {
        x: 0,
        y: idealSpreaderY,
        angleRad: 0,
        vx: 0,
        vy: 0,
      },
      cask: { x: 0, y: caskY, angleRad: 0, vx: 0, vy: 0 },
      spreaderHalfHeight: halfS,
      caskHalfHeight: halfC,
      config: DEFAULT_LOCK_CONFIG,
    });
    expect(result.ok).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("rejects large horizontal error", () => {
    const caskY = 6;
    const idealSpreaderY = caskY - halfC - halfS;
    const result = evaluateLockAlignment({
      spreader: {
        x: 3,
        y: idealSpreaderY,
        angleRad: 0,
        vx: 0,
        vy: 0,
      },
      cask: { x: 0, y: caskY, angleRad: 0, vx: 0, vy: 0 },
      spreaderHalfHeight: halfS,
      caskHalfHeight: halfC,
      config: DEFAULT_LOCK_CONFIG,
    });
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("horizontal");
  });

  it("rejects high relative speed", () => {
    const caskY = 6;
    const idealSpreaderY = caskY - halfC - halfS;
    const result = evaluateLockAlignment({
      spreader: {
        x: 0,
        y: idealSpreaderY,
        angleRad: 0,
        vx: 5,
        vy: 0,
      },
      cask: { x: 0, y: caskY, angleRad: 0, vx: 0, vy: 0 },
      spreaderHalfHeight: halfS,
      caskHalfHeight: halfC,
      config: DEFAULT_LOCK_CONFIG,
    });
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("speed");
  });

  it("rejects a visible air gap above the cask", () => {
    const caskY = 6;
    const idealSpreaderY = caskY - halfC - halfS;
    // Hover well above contact (0.4 units of air — wider than maxVerticalError).
    const result = evaluateLockAlignment({
      spreader: {
        x: 0,
        y: idealSpreaderY - 0.4,
        angleRad: 0,
        vx: 0,
        vy: 0,
      },
      cask: { x: 0, y: caskY, angleRad: 0, vx: 0, vy: 0 },
      spreaderHalfHeight: halfS,
      caskHalfHeight: halfC,
      config: DEFAULT_LOCK_CONFIG,
    });
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("vertical");
  });

  it("still accepts a tiny seating band around contact", () => {
    const caskY = 6;
    const idealSpreaderY = caskY - halfC - halfS;
    const result = evaluateLockAlignment({
      spreader: {
        x: 0,
        y: idealSpreaderY - DEFAULT_LOCK_CONFIG.maxVerticalError * 0.5,
        angleRad: 0,
        vx: 0,
        vy: 0,
      },
      cask: { x: 0, y: caskY, angleRad: 0, vx: 0, vy: 0 },
      spreaderHalfHeight: halfS,
      caskHalfHeight: halfC,
      config: DEFAULT_LOCK_CONFIG,
    });
    expect(result.ok).toBe(true);
  });
});
