import { describe, expect, it } from "vitest";
import {
  createZeroUnloadingMetrics,
  parseUnloadingMetrics,
  unloadingMetricsSchema,
} from "@shared/contracts/unloadingMetrics";
import {
  createZeroUnloadingMetrics as protocolZero,
  unloadingMetricsSchema as protocolSchema,
} from "@/game/protocol";

describe("unloadingMetrics (shared)", () => {
  it("parses zero metrics", () => {
    const zero = createZeroUnloadingMetrics();
    expect(unloadingMetricsSchema.parse(zero)).toEqual(zero);
    expect(zero.elapsedTicks).toBe(0);
    expect(zero.maximumSway).toBe(0);
  });

  it("accepts a full finite payload", () => {
    const sample = parseUnloadingMetrics({
      maximumSway: 12.4,
      integratedSway: 839.2,
      maximumCableLoad: 71.8,
      highCableLoadTicks: 120,
      maximumCaskAcceleration: 8.1,
      collisionImpulse: 0,
      collisionCount: 0,
      landingPositionError: 2.7,
      landingAngleError: 1.2,
      landingVerticalSpeed: 0.34,
      landingHorizontalSpeed: 0.08,
      interlockCount: 0,
      elapsedTicks: 18342,
    });
    expect(sample.elapsedTicks).toBe(18342);
    expect(sample.maximumSway).toBe(12.4);
  });

  it("rejects negative and non-finite values", () => {
    const base = createZeroUnloadingMetrics();
    expect(() => unloadingMetricsSchema.parse({ ...base, maximumSway: -1 })).toThrow();
    expect(() =>
      unloadingMetricsSchema.parse({ ...base, integratedSway: Number.NaN }),
    ).toThrow();
    expect(() =>
      unloadingMetricsSchema.parse({
        ...base,
        maximumCableLoad: Number.POSITIVE_INFINITY,
      }),
    ).toThrow();
  });

  it("rejects missing fields", () => {
    expect(() => unloadingMetricsSchema.parse({ maximumSway: 0 })).toThrow();
  });

  it("is re-exported from the game protocol barrel", () => {
    expect(protocolZero()).toEqual(createZeroUnloadingMetrics());
    expect(protocolSchema).toBe(unloadingMetricsSchema);
  });
});
