import { describe, expect, it } from "vitest";
import {
  DEFAULT_WIND_ENVIRONMENT_CONFIG,
  assertWindEnvironmentConfigInvariants,
  windConfigForLoadState,
  windEnvironmentConfigSchema,
} from "@/game/unloading/windEnvironmentConfig";

describe("windEnvironmentConfig", () => {
  it("parses defaults", () => {
    expect(() =>
      windEnvironmentConfigSchema.parse(DEFAULT_WIND_ENVIRONMENT_CONFIG),
    ).not.toThrow();
    expect(() =>
      assertWindEnvironmentConfigInvariants(DEFAULT_WIND_ENVIRONMENT_CONFIG),
    ).not.toThrow();
  });

  it("uses mild pre-lock force and stronger locked force", () => {
    expect(DEFAULT_WIND_ENVIRONMENT_CONFIG.baseForce).toBeGreaterThan(4);
    expect(DEFAULT_WIND_ENVIRONMENT_CONFIG.baseForce).toBeLessThan(15);
    expect(DEFAULT_WIND_ENVIRONMENT_CONFIG.lockedBaseForce).toBeGreaterThan(
      DEFAULT_WIND_ENVIRONMENT_CONFIG.baseForce,
    );
    expect(DEFAULT_WIND_ENVIRONMENT_CONFIG.lockedBaseForce).toBeGreaterThan(50);
    expect(DEFAULT_WIND_ENVIRONMENT_CONFIG.lockedBaseForce).toBeLessThan(120);
    expect(DEFAULT_WIND_ENVIRONMENT_CONFIG.directionBias).toBe(0);
    expect(DEFAULT_WIND_ENVIRONMENT_CONFIG.oscWeight).toBeGreaterThan(0.4);
  });

  it("switches force scale when locked", () => {
    const unlocked = windConfigForLoadState(DEFAULT_WIND_ENVIRONMENT_CONFIG, false);
    const locked = windConfigForLoadState(DEFAULT_WIND_ENVIRONMENT_CONFIG, true);
    expect(unlocked.baseForce).toBe(DEFAULT_WIND_ENVIRONMENT_CONFIG.baseForce);
    expect(locked.baseForce).toBe(DEFAULT_WIND_ENVIRONMENT_CONFIG.lockedBaseForce);
    expect(locked.maxForceAbs).toBe(DEFAULT_WIND_ENVIRONMENT_CONFIG.lockedMaxForceAbs);
    // Driver params stay shared so direction is continuous across lock.
    expect(locked.oscFrequency).toBe(unlocked.oscFrequency);
  });

  it("rejects invalid baseDirectionX", () => {
    expect(() =>
      windEnvironmentConfigSchema.parse({
        ...DEFAULT_WIND_ENVIRONMENT_CONFIG,
        baseDirectionX: 0,
      }),
    ).toThrow();
  });

  it("rejects baseForce above maxForceAbs", () => {
    const bad = windEnvironmentConfigSchema.parse({
      ...DEFAULT_WIND_ENVIRONMENT_CONFIG,
      baseForce: 150,
      maxForceAbs: 100,
    });
    expect(() => assertWindEnvironmentConfigInvariants(bad)).toThrow(/baseForce/);
  });

  it("rejects lockedBaseForce above lockedMaxForceAbs", () => {
    const bad = windEnvironmentConfigSchema.parse({
      ...DEFAULT_WIND_ENVIRONMENT_CONFIG,
      lockedBaseForce: 150,
      lockedMaxForceAbs: 100,
    });
    expect(() => assertWindEnvironmentConfigInvariants(bad)).toThrow(/lockedBaseForce/);
  });
});
