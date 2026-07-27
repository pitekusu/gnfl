import { describe, expect, it } from "vitest";
import { GreyboxDemoWorld } from "@/game/simulation/greyboxDemoWorld";
import { initRapier } from "@/game/simulation/rapierInit";
import { shouldEmitSnapshot } from "@/game/simulation/snapshotSchedule";

describe("greybox demo world", () => {
  it("builds JSON-safe snapshots without rapier handles", async () => {
    const rapier = await initRapier();
    const world = GreyboxDemoWorld.create(rapier, 30);
    const snapshot = world.buildSnapshot(0, 1000);

    expect(() => JSON.stringify(snapshot)).not.toThrow();
    expect(snapshot.entities).toHaveLength(2);
    expect(snapshot.entities.some((e) => e.id === GreyboxDemoWorld.BOX_ID)).toBe(true);

    world.free();
  });

  it("drops the box toward the floor under gravity", async () => {
    const rapier = await initRapier();
    const world = GreyboxDemoWorld.create(rapier, 30);
    const before = world.buildSnapshot(0, 0);
    const boxBefore = before.entities.find((e) => e.id === GreyboxDemoWorld.BOX_ID);
    expect(boxBefore).toBeDefined();

    for (let i = 0; i < 120; i += 1) {
      world.step();
    }

    const after = world.buildSnapshot(120, 1);
    const boxAfter = after.entities.find((e) => e.id === GreyboxDemoWorld.BOX_ID);
    expect(boxAfter).toBeDefined();
    expect(boxAfter!.y).toBeGreaterThan(boxBefore!.y);

    world.free();
  });
});

describe("snapshot schedule", () => {
  it("emits every other tick at 120/60", () => {
    expect(shouldEmitSnapshot(1, 120, 60)).toBe(false);
    expect(shouldEmitSnapshot(2, 120, 60)).toBe(true);
    expect(shouldEmitSnapshot(4, 120, 60)).toBe(true);
  });
});
