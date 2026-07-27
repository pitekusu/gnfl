import { describe, expect, it } from "vitest";
import { initRapier } from "@/game/simulation/rapierInit";
import { DEFAULT_UNLOADING_LAYOUT } from "@/game/unloading/layout";
import { UnloadingScaffoldWorld } from "@/game/unloading/scaffoldWorld";

describe("UnloadingScaffoldWorld", () => {
  it("exposes ship, quay, and cradle entities", async () => {
    const rapier = await initRapier();
    const world = UnloadingScaffoldWorld.create(rapier, 18, 120, "test-seed");
    const snapshot = world.buildSnapshot(0, 0);

    expect(snapshot.entities.map((e) => e.kind).sort()).toEqual(
      ["cradle", "quay", "ship"].sort(),
    );

    const ship = snapshot.entities.find((e) => e.id === UnloadingScaffoldWorld.SHIP_ID);
    const quay = snapshot.entities.find((e) => e.id === UnloadingScaffoldWorld.QUAY_ID);
    const cradle = snapshot.entities.find(
      (e) => e.id === UnloadingScaffoldWorld.CRADLE_ID,
    );

    expect(ship?.x).toBeCloseTo(DEFAULT_UNLOADING_LAYOUT.ship.restCenterX, 4);
    expect(quay?.x).toBeCloseTo(DEFAULT_UNLOADING_LAYOUT.quay.centerX, 5);
    expect(cradle?.x).toBeCloseTo(DEFAULT_UNLOADING_LAYOUT.cradle.centerX, 5);
    expect(() => JSON.stringify(snapshot)).not.toThrow();
    world.free();
  });

  it("moves the kinematic ship over time for a given seed", async () => {
    const rapier = await initRapier();
    const world = UnloadingScaffoldWorld.create(rapier, 18, 120, "motion-seed");
    const before = world.buildSnapshot(0, 0);
    const shipBefore = before.entities.find(
      (e) => e.id === UnloadingScaffoldWorld.SHIP_ID,
    );

    for (let i = 0; i < 120; i += 1) {
      world.step();
    }

    const after = world.buildSnapshot(120, 1);
    const shipAfter = after.entities.find(
      (e) => e.id === UnloadingScaffoldWorld.SHIP_ID,
    );

    expect(shipBefore).toBeDefined();
    expect(shipAfter).toBeDefined();
    const moved =
      Math.abs((shipAfter?.y ?? 0) - (shipBefore?.y ?? 0)) > 1e-4 ||
      Math.abs((shipAfter?.angleRad ?? 0) - (shipBefore?.angleRad ?? 0)) > 1e-4;
    expect(moved).toBe(true);
    world.free();
  });

  it("reproduces ship pose for the same seed and step count", async () => {
    const rapier = await initRapier();
    const a = UnloadingScaffoldWorld.create(rapier, 18, 120, "same-seed");
    const b = UnloadingScaffoldWorld.create(rapier, 18, 120, "same-seed");
    for (let i = 0; i < 90; i += 1) {
      a.step();
      b.step();
    }
    const sa = a
      .buildSnapshot(90, 0)
      .entities.find((e) => e.id === UnloadingScaffoldWorld.SHIP_ID);
    const sb = b
      .buildSnapshot(90, 0)
      .entities.find((e) => e.id === UnloadingScaffoldWorld.SHIP_ID);
    expect(sa?.x).toBeCloseTo(sb?.x ?? 0, 5);
    expect(sa?.y).toBeCloseTo(sb?.y ?? 0, 5);
    expect(sa?.angleRad).toBeCloseTo(sb?.angleRad ?? 0, 5);
    a.free();
    b.free();
  });
});
