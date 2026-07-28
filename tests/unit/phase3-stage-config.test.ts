import { describe, expect, it } from "vitest";
import {
  DEFAULT_INTERLOCK_CONFIG,
  interlockConfigSchema,
} from "@/game/unloading/interlockConfig";
import { DEFAULT_LOCK_CONFIG, lockConfigSchema } from "@/game/unloading/lockConfig";
import { DEFAULT_UNLOADING_LAYOUT } from "@/game/unloading/layout";
import {
  clearOfHoldCaskCenterY,
  clearOfHoldCaskCenterYRest,
  cradleTopY,
  holdMouthLocalY,
  isCaskClearOfHold,
  isOverCradleZone,
} from "@/game/unloading/stageThresholds";

describe("lockConfig", () => {
  it("parses defaults", () => {
    expect(() => lockConfigSchema.parse(DEFAULT_LOCK_CONFIG)).not.toThrow();
  });

  it("rejects non-positive horizontal error", () => {
    expect(() =>
      lockConfigSchema.parse({
        ...DEFAULT_LOCK_CONFIG,
        maxHorizontalError: 0,
      }),
    ).toThrow();
  });
});

describe("interlockConfig", () => {
  it("parses defaults", () => {
    expect(() => interlockConfigSchema.parse(DEFAULT_INTERLOCK_CONFIG)).not.toThrow();
  });

  it("defaults unlocked hoist-up to full speed (cable recovery)", () => {
    expect(DEFAULT_INTERLOCK_CONFIG.unlockedHoistUpSpeedScale).toBe(1);
  });

  it("allows fully blocked unlocked hoist via scale 0", () => {
    expect(() =>
      interlockConfigSchema.parse({
        ...DEFAULT_INTERLOCK_CONFIG,
        unlockedHoistUpSpeedScale: 0,
      }),
    ).not.toThrow();
  });

  it("rejects trolley speed scale above 1", () => {
    expect(() =>
      interlockConfigSchema.parse({
        ...DEFAULT_INTERLOCK_CONFIG,
        lowClearanceTrolleySpeedScale: 1.5,
      }),
    ).toThrow();
  });
});

describe("stageThresholds", () => {
  it("places hold mouth above the hold floor in ship-local Y", () => {
    const mouth = holdMouthLocalY(DEFAULT_UNLOADING_LAYOUT);
    expect(mouth).toBeLessThan(DEFAULT_UNLOADING_LAYOUT.ship.holdFloorOffsetY);
  });

  it("places clear-of-hold threshold above cradle top (skyward = smaller Y)", () => {
    const clearY = clearOfHoldCaskCenterYRest();
    const cradleTop = cradleTopY();
    // Clear height should be well above the cradle (smaller Y than cradle top).
    expect(clearY).toBeLessThan(cradleTop);
  });

  it("keeps clear threshold consistent with ship rest pose", () => {
    const clearY = clearOfHoldCaskCenterYRest(DEFAULT_UNLOADING_LAYOUT);
    expect(Number.isFinite(clearY)).toBe(true);
    // Still within broad world play band.
    expect(clearY).toBeGreaterThan(DEFAULT_INTERLOCK_CONFIG.worldBounds.minY);
    expect(clearY).toBeLessThan(DEFAULT_INTERLOCK_CONFIG.worldBounds.maxY);
  });

  it("treats lower Y as clear and tracks ship heave", () => {
    const restY = DEFAULT_UNLOADING_LAYOUT.ship.restCenterY;
    const threshold = clearOfHoldCaskCenterY(restY);
    expect(isCaskClearOfHold(threshold, restY)).toBe(true);
    expect(isCaskClearOfHold(threshold + 0.5, restY)).toBe(false);
    // Ship heaving down (larger Y) raises the clear threshold (harder to clear).
    expect(clearOfHoldCaskCenterY(restY + 0.4)).toBeGreaterThan(threshold);
  });

  it("marks over-cradle by horizontal pad band", () => {
    const { cradle } = DEFAULT_UNLOADING_LAYOUT;
    expect(isOverCradleZone(cradle.centerX)).toBe(true);
    expect(isOverCradleZone(cradle.centerX + cradle.halfWidth)).toBe(true);
    expect(isOverCradleZone(cradle.centerX + cradle.halfWidth + 0.2)).toBe(false);
  });
});
