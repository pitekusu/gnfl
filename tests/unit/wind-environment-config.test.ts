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

  it("uses a moderate base force (not extreme)", () => {
    expect(DEFAULT_WIND_ENVIRONMENT_CONFIG.baseForce).toBeGreaterThan(40);
    expect(DEFAULT_WIND_ENVIRONMENT_CONFIG.baseForce).toBeLessThan(100);
  });

  it("rejects invalid baseDirectionX", () => {
    expect(() =>
      windEnvironmentConfigSchema.parse({
        ...DEFAULT_WIND_ENVIRONMENT_CONFIG,
        baseDirectionX: 0,
      }),
    ).toThrow();
  });

  it("rejects baseForce above maxForceAbs via invariant", () => {
    const bad = windEnvironmentConfigSchema.parse({
      ...DEFAULT_WIND_ENVIRONMENT_CONFIG,
      baseForce: 200,
      maxForceAbs: 100,
    });
    expect(() => assertWindEnvironmentConfigInvariants(bad)).toThrow(/baseForce/);
  });

  it("rejects all-zero band weights via invariant", () => {
    const bad = windEnvironmentConfigSchema.parse({
      ...DEFAULT_WIND_ENVIRONMENT_CONFIG,
      slowWeight: 0,
      midWeight: 0,
      fastWeight: 0,
    });
    expect(() => assertWindEnvironmentConfigInvariants(bad)).toThrow(/weights/);
  });
});
