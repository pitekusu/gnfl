import { describe, expect, it } from "vitest";
import { initRapier } from "@/game/simulation/rapierInit";
import { DEFAULT_UNLOADING_LAYOUT } from "@/game/unloading/layout";
import { UnloadingScaffoldWorld } from "@/game/unloading/scaffoldWorld";

describe("UnloadingScaffoldWorld", () => {
  it("places the quay from the default layout", async () => {
    const rapier = await initRapier();
    const world = UnloadingScaffoldWorld.create(rapier, 18, 120);
    const snapshot = world.buildSnapshot(0, 0);

    expect(snapshot.entities).toHaveLength(1);
    expect(snapshot.entities[0]?.kind).toBe("quay");
    expect(snapshot.entities[0]?.id).toBe(UnloadingScaffoldWorld.QUAY_ID);
    expect(snapshot.entities[0]?.x).toBe(DEFAULT_UNLOADING_LAYOUT.quay.centerX);
    expect(snapshot.entities[0]?.y).toBe(DEFAULT_UNLOADING_LAYOUT.quay.centerY);
    expect(snapshot.entities[0]?.width).toBe(
      DEFAULT_UNLOADING_LAYOUT.quay.halfWidth * 2,
    );
    expect(() => JSON.stringify(snapshot)).not.toThrow();

    world.free();
  });

  it("steps without adding dynamic bodies", async () => {
    const rapier = await initRapier();
    const world = UnloadingScaffoldWorld.create(rapier, 18, 120);
    for (let i = 0; i < 60; i += 1) {
      world.step();
    }
    const snapshot = world.buildSnapshot(60, 1);
    expect(snapshot.entities).toHaveLength(1);
    expect(snapshot.entities[0]?.y).toBe(DEFAULT_UNLOADING_LAYOUT.quay.centerY);
    world.free();
  });
});
