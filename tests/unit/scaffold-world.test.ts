import { describe, expect, it } from "vitest";
import { createNeutralPlayerInput } from "@/game/protocol";
import { initRapier } from "@/game/simulation/rapierInit";
import { DEFAULT_UNLOADING_LAYOUT } from "@/game/unloading/layout";
import { UnloadingScaffoldWorld } from "@/game/unloading/scaffoldWorld";

describe("UnloadingScaffoldWorld", () => {
  it("exposes ship, quay, cradle, and trolley entities", async () => {
    const rapier = await initRapier();
    const world = UnloadingScaffoldWorld.create(rapier, 18, 120, "test-seed");
    const snapshot = world.buildSnapshot(0, 0);

    expect(snapshot.entities.map((e) => e.kind).sort()).toEqual(
      ["cradle", "quay", "ship", "trolley"].sort(),
    );

    const trolley = snapshot.entities.find(
      (e) => e.id === UnloadingScaffoldWorld.TROLLEY_ID,
    );
    expect(trolley?.y).toBeCloseTo(DEFAULT_UNLOADING_LAYOUT.crane.railY, 5);
    expect(trolley?.x).toBeCloseTo(DEFAULT_UNLOADING_LAYOUT.crane.spreaderSpawnX, 4);
    expect(() => JSON.stringify(snapshot)).not.toThrow();
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
