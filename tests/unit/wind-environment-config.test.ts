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

  it("keeps a strong always-on base force", () => {
    expect(DEFAULT_WIND_ENVIRONMENT_CONFIG.baseForce).toBeGreaterThanOrEqual(100);
    expect(DEFAULT_WIND_ENVIRONMENT_CONFIG.minForceFraction).toBeGreaterThanOrEqual(
      0.5,
    );
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

  it("accepts a calm always-on breeze", () => {
    const calm = windEnvironmentConfigSchema.parse({
      ...DEFAULT_WIND_ENVIRONMENT_CONFIG,
      baseForce: 30,
      minForceFraction: 0.5,
      maxForceAbs: 60,
      directionBias: 0,
    });
    expect(() => assertWindEnvironmentConfigInvariants(calm)).not.toThrow();
  });
});
