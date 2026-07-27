import { describe, expect, it } from "vitest";
import { initRapier } from "@/game/simulation/rapierInit";
import { DEFAULT_UNLOADING_LAYOUT } from "@/game/unloading/layout";
import { UnloadingScaffoldWorld } from "@/game/unloading/scaffoldWorld";

describe("UnloadingScaffoldWorld", () => {
  it("exposes fixed quay and cradle entities from layout", async () => {
    const rapier = await initRapier();
    const world = UnloadingScaffoldWorld.create(rapier, 18, 120);
    const snapshot = world.buildSnapshot(0, 0);

    expect(snapshot.entities).toHaveLength(2);

    const quay = snapshot.entities.find((e) => e.id === UnloadingScaffoldWorld.QUAY_ID);
    const cradle = snapshot.entities.find(
      (e) => e.id === UnloadingScaffoldWorld.CRADLE_ID,
    );

    expect(quay?.kind).toBe("quay");
    expect(quay?.x).toBeCloseTo(DEFAULT_UNLOADING_LAYOUT.quay.centerX, 5);
    expect(quay?.y).toBeCloseTo(DEFAULT_UNLOADING_LAYOUT.quay.centerY, 5);
    expect(quay?.width).toBe(DEFAULT_UNLOADING_LAYOUT.quay.halfWidth * 2);

    expect(cradle?.kind).toBe("cradle");
    expect(cradle?.x).toBeCloseTo(DEFAULT_UNLOADING_LAYOUT.cradle.centerX, 5);
    expect(cradle?.y).toBeCloseTo(DEFAULT_UNLOADING_LAYOUT.cradle.centerY, 5);
    expect(cradle?.width).toBe(DEFAULT_UNLOADING_LAYOUT.cradle.halfWidth * 2);

    expect(() => JSON.stringify(snapshot)).not.toThrow();
    world.free();
  });

  it("keeps static bodies fixed after stepping", async () => {
    const rapier = await initRapier();
    const world = UnloadingScaffoldWorld.create(rapier, 18, 120);
    for (let i = 0; i < 60; i += 1) {
      world.step();
    }
    const snapshot = world.buildSnapshot(60, 1);
    expect(snapshot.entities).toHaveLength(2);
    expect(
      snapshot.entities.find((e) => e.id === UnloadingScaffoldWorld.QUAY_ID)?.y,
    ).toBeCloseTo(DEFAULT_UNLOADING_LAYOUT.quay.centerY, 5);
    expect(
      snapshot.entities.find((e) => e.id === UnloadingScaffoldWorld.CRADLE_ID)?.y,
    ).toBeCloseTo(DEFAULT_UNLOADING_LAYOUT.cradle.centerY, 5);
    world.free();
  });
});
