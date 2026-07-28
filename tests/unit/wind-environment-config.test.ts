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

  it("keeps a non-zero base force for always-on wind", () => {
    expect(DEFAULT_WIND_ENVIRONMENT_CONFIG.baseForce).toBeGreaterThan(0);
  });

  it("rejects invalid baseDirectionX", () => {
    expect(() =>
      windEnvironmentConfigSchema.parse({
        ...DEFAULT_WIND_ENVIRONMENT_CONFIG,
        baseDirectionX: 0,
      }),
    ).toThrow();
  });

  it("rejects variation above schema max", () => {
    expect(() =>
      windEnvironmentConfigSchema.parse({
        ...DEFAULT_WIND_ENVIRONMENT_CONFIG,
        variation: 3,
      }),
    ).toThrow();
  });

  it("rejects baseForce above maxForceAbs via invariant", () => {
    const bad = windEnvironmentConfigSchema.parse({
      ...DEFAULT_WIND_ENVIRONMENT_CONFIG,
      baseForce: 200,
      maxForceAbs: 100,
      variation: 0,
    });
    expect(() => assertWindEnvironmentConfigInvariants(bad)).toThrow(/baseForce/);
  });

  it("accepts a calm always-on breeze", () => {
    const calm = windEnvironmentConfigSchema.parse({
      ...DEFAULT_WIND_ENVIRONMENT_CONFIG,
      baseForce: 12,
      variation: 0.3,
      maxForceAbs: 40,
      jitterMix: 0,
    });
    expect(() => assertWindEnvironmentConfigInvariants(calm)).not.toThrow();
  });
});
