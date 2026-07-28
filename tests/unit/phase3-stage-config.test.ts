import { describe, expect, it } from "vitest";
import {
  DEFAULT_INTERLOCK_CONFIG,
  interlockConfigSchema,
} from "@/game/unloading/interlockConfig";
import { DEFAULT_LOCK_CONFIG, lockConfigSchema } from "@/game/unloading/lockConfig";
import { DEFAULT_UNLOADING_LAYOUT } from "@/game/unloading/layout";
import {
  clearOfHoldCaskCenterYRest,
  cradleTopY,
  holdMouthLocalY,
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

  it("allows fully blocked unlocked hoist (scale 0)", () => {
    expect(DEFAULT_INTERLOCK_CONFIG.unlockedHoistUpSpeedScale).toBe(0);
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
});
