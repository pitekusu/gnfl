import { describe, expect, it } from "vitest";
import { createNeutralPlayerInput } from "@/game/protocol";
import { initRapier } from "@/game/simulation/rapierInit";
import { DEFAULT_UNLOADING_LAYOUT } from "@/game/unloading/layout";
import { UnloadingScaffoldWorld } from "@/game/unloading/scaffoldWorld";

describe("UnloadingScaffoldWorld", () => {
  it("exposes trolley, spreader, cask, and cable segments", async () => {
    const rapier = await initRapier();
    const world = UnloadingScaffoldWorld.create(rapier, 18, 120, "test-seed");
    // One step builds cable state used by the snapshot.
    world.step();
    const snapshot = world.buildSnapshot(1, 0);

    expect(snapshot.entities.map((e) => e.kind)).toEqual(
      expect.arrayContaining(["ship", "quay", "cradle", "trolley", "spreader", "cask"]),
    );
    expect(snapshot.cables).toHaveLength(2);
    expect(snapshot.cables[0]?.id).toBe("cable-left");
    expect(snapshot.cables[1]?.id).toBe("cable-right");
    expect(() => JSON.stringify(snapshot)).not.toThrow();
    world.free();
  });

  it("settles the free cask onto the ship hold floor", async () => {
    const rapier = await initRapier();
    const world = UnloadingScaffoldWorld.create(rapier, 18, 120, "cask-seed");
    const start = world.getCaskTranslation();
    for (let i = 0; i < 240; i += 1) {
      world.step();
    }
    const settled = world.getCaskTranslation();
    // Y-down: resting on the hold floor is lower (larger y) than the spawn mouth.
    expect(settled.y).toBeGreaterThan(start.y);
    // Still roughly under the hold (not teleported to the quay).
    expect(
      Math.abs(settled.x - DEFAULT_UNLOADING_LAYOUT.ship.restCenterX),
    ).toBeLessThan(DEFAULT_UNLOADING_LAYOUT.ship.halfWidth);
    world.free();
  });

  it("moves the trolley along the rail from control input", async () => {
    const rapier = await initRapier();
    const world = UnloadingScaffoldWorld.create(rapier, 18, 120, "trolley-seed");
    const startX = world.getTrolleyX();

    world.setControlInput({
      ...createNeutralPlayerInput(),
      trolleyAxis: 1,
    });
    for (let i = 0; i < 120; i += 1) {
      world.step();
    }

    expect(world.getTrolleyX()).toBeGreaterThan(startX + 0.5);
    world.free();
  });

  it("lets the spreader settle near the cable target length below the trolley", async () => {
    const rapier = await initRapier();
    const world = UnloadingScaffoldWorld.create(rapier, 18, 120, "hang-seed");
    for (let i = 0; i < 360; i += 1) {
      world.step();
    }
    const spreader = world.getSpreaderTranslation();
    const target = world.getCableTargetLength();
    const hang = spreader.y - DEFAULT_UNLOADING_LAYOUT.crane.railY;
    // Hang distance should be near the target length (within a generous band).
    expect(hang).toBeGreaterThan(target * 0.5);
    expect(hang).toBeLessThan(target * 1.6);
    expect(spreader.y).toBeGreaterThan(DEFAULT_UNLOADING_LAYOUT.crane.railY);
    world.free();
  });

  it("sways the spreader after a trolley move then stop", async () => {
    const rapier = await initRapier();
    const world = UnloadingScaffoldWorld.create(rapier, 18, 120, "sway-seed");
    // Settle first.
    for (let i = 0; i < 180; i += 1) {
      world.step();
    }
    world.setControlInput({
      ...createNeutralPlayerInput(),
      trolleyAxis: 1,
    });
    for (let i = 0; i < 60; i += 1) {
      world.step();
    }
    world.setControlInput(createNeutralPlayerInput());
    let maxAbsVx = 0;
    for (let i = 0; i < 90; i += 1) {
      world.step();
      const snap = world.buildSnapshot(i, 0);
      maxAbsVx = Math.max(maxAbsVx, snap.instruments.sway);
    }
    expect(maxAbsVx).toBeGreaterThan(0.05);
    world.free();
  });
});
