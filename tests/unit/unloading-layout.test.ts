import { describe, expect, it } from "vitest";
import {
  DEFAULT_CRANE_PHYSICS_CONFIG,
  assertCranePhysicsConfigInvariants,
  cranePhysicsConfigSchema,
} from "@/game/unloading/cranePhysicsConfig";
import {
  DEFAULT_UNLOADING_LAYOUT,
  assertUnloadingLayoutInvariants,
  quayLeftX,
  shipRestRightX,
  unloadingLayoutSchema,
} from "@/game/unloading/layout";

describe("unloading layout", () => {
  it("parses the default layout", () => {
    expect(() => unloadingLayoutSchema.parse(DEFAULT_UNLOADING_LAYOUT)).not.toThrow();
  });

  it("keeps ship left of quay with a water gap", () => {
    expect(() =>
      assertUnloadingLayoutInvariants(DEFAULT_UNLOADING_LAYOUT),
    ).not.toThrow();
    expect(DEFAULT_UNLOADING_LAYOUT.ship.restCenterX).toBeLessThan(
      DEFAULT_UNLOADING_LAYOUT.quay.centerX,
    );
    expect(DEFAULT_UNLOADING_LAYOUT.crane.railY).toBeLessThan(
      DEFAULT_UNLOADING_LAYOUT.quay.centerY,
    );
    expect(
      quayLeftX(DEFAULT_UNLOADING_LAYOUT) - shipRestRightX(DEFAULT_UNLOADING_LAYOUT),
    ).toBeGreaterThanOrEqual(1.5);
  });

  it("starts the crane over the quay, not over the ship hold", () => {
    expect(DEFAULT_UNLOADING_LAYOUT.crane.spreaderSpawnX).toBeGreaterThanOrEqual(
      quayLeftX(DEFAULT_UNLOADING_LAYOUT),
    );
    expect(DEFAULT_UNLOADING_LAYOUT.crane.spreaderSpawnX).toBeGreaterThan(
      DEFAULT_UNLOADING_LAYOUT.cask.spawnX,
    );
  });

  it("rejects inverted rail limits", () => {
    const bad = {
      ...DEFAULT_UNLOADING_LAYOUT,
      crane: {
        ...DEFAULT_UNLOADING_LAYOUT.crane,
        railMinX: 10,
        railMaxX: -10,
      },
    };
    expect(() => assertUnloadingLayoutInvariants(bad)).toThrow(/railMinX/);
  });

  it("rejects ship/quay horizontal overlap", () => {
    const bad = {
      ...DEFAULT_UNLOADING_LAYOUT,
      ship: {
        ...DEFAULT_UNLOADING_LAYOUT.ship,
        restCenterX: 0,
        halfWidth: 12,
      },
    };
    expect(() => assertUnloadingLayoutInvariants(bad)).toThrow(/horizontal gap/);
  });
});

describe("crane physics config", () => {
  it("parses the default config", () => {
    expect(() =>
      cranePhysicsConfigSchema.parse(DEFAULT_CRANE_PHYSICS_CONFIG),
    ).not.toThrow();
  });

  it("keeps initial cable length in range", () => {
    expect(() =>
      assertCranePhysicsConfigInvariants(DEFAULT_CRANE_PHYSICS_CONFIG),
    ).not.toThrow();
    const { hoist } = DEFAULT_CRANE_PHYSICS_CONFIG;
    expect(hoist.initialCableLength).toBeGreaterThanOrEqual(hoist.minCableLength);
    expect(hoist.initialCableLength).toBeLessThanOrEqual(hoist.maxCableLength);
  });

  it("rejects fine-mode scale above 1 via schema", () => {
    expect(() =>
      cranePhysicsConfigSchema.parse({
        ...DEFAULT_CRANE_PHYSICS_CONFIG,
        fineMode: { speedScale: 1.5 },
      }),
    ).toThrow();
  });
});
