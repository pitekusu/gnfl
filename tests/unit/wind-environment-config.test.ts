import { describe, expect, it } from "vitest";
import {
  DEFAULT_WIND_ENVIRONMENT_CONFIG,
  assertWindEnvironmentConfigInvariants,
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

  it("uses moderate force and zero default direction bias", () => {
    expect(DEFAULT_WIND_ENVIRONMENT_CONFIG.baseForce).toBeGreaterThan(10);
    expect(DEFAULT_WIND_ENVIRONMENT_CONFIG.baseForce).toBeLessThan(30);
    expect(DEFAULT_WIND_ENVIRONMENT_CONFIG.directionBias).toBe(0);
    expect(DEFAULT_WIND_ENVIRONMENT_CONFIG.oscWeight).toBeGreaterThan(0.4);
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
});
