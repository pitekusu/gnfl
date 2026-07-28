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
    expect(snapshot.stagePhase).toBe("READY");
    expect(world.getStagePhase()).toBe("READY");
    expect(snapshot.cables).toHaveLength(2);
    expect(snapshot.cables[0]?.id).toBe("cable-left");
    expect(snapshot.cables[1]?.id).toBe("cable-right");
    expect(() => JSON.stringify(snapshot)).not.toThrow();
    world.free();
  });

  it("reflects dispatched stage machine events in snapshots", async () => {
    const rapier = await initRapier();
    const world = UnloadingScaffoldWorld.create(rapier, 18, 120, "phase-seed");
    expect(world.dispatchStageEvent({ type: "ALIGNMENT_OK" })).toBe(true);
    expect(world.getStagePhase()).toBe("ALIGNING");
    // Snapshot must show the dispatched phase before the next physics tick.
    expect(world.buildSnapshot(1, 0).stagePhase).toBe("ALIGNING");
    // Per-step lock evaluation reverts ALIGNING when the spreader is not lockReady.
    world.step();
    expect(world.getStagePhase()).toBe("READY");
    expect(world.buildSnapshot(2, 0).stagePhase).toBe("READY");
    world.free();
  });

  it("sets lockReady when spreader is held aligned over the cask", async () => {
    const rapier = await initRapier();
    const world = UnloadingScaffoldWorld.create(rapier, 18, 120, "align-seed");
    // Settle cask, then snap spreader into ideal pose and hold still.
    for (let i = 0; i < 60; i += 1) {
      world.step();
    }
    world.snapSpreaderToCaskLockPose();
    for (let i = 0; i < 20; i += 1) {
      world.snapSpreaderToCaskLockPose();
      world.step();
    }
    expect(world.isLockReady()).toBe(true);
    expect(world.buildSnapshot(80, 0).instruments.lockReady).toBe(true);
    expect(world.getStagePhase()).toBe("ALIGNING");
    world.free();
  });

  it("engages fixed lock joint on Space when lockReady", async () => {
    const rapier = await initRapier();
    const world = UnloadingScaffoldWorld.create(rapier, 18, 120, "lock-seed");
    for (let i = 0; i < 60; i += 1) {
      world.step();
    }
    for (let i = 0; i < 24; i += 1) {
      world.snapSpreaderToCaskLockPose();
      world.step();
    }
    expect(world.isLockReady()).toBe(true);

    world.setControlInput({
      ...createNeutralPlayerInput(),
      lockPressed: true,
    });
    world.step();

    expect(world.isLockJointActive()).toBe(true);
    expect(world.getStagePhase()).toBe("LOCKED");
    expect(world.buildSnapshot(100, 0).stagePhase).toBe("LOCKED");
    expect(world.isLockReady()).toBe(false);

    // Space without readiness should not create a second joint path — already locked.
    world.setControlInput({
      ...createNeutralPlayerInput(),
      lockPressed: true,
    });
    world.step();
    expect(world.getStagePhase()).toBe("LOCKED");
    world.free();
  });

  it("does not lock when Space is pressed without lockReady", async () => {
    const rapier = await initRapier();
    const world = UnloadingScaffoldWorld.create(rapier, 18, 120, "nolock-seed");
    world.step();
    expect(world.isLockReady()).toBe(false);

    world.setControlInput({
      ...createNeutralPlayerInput(),
      lockPressed: true,
    });
    world.step();

    expect(world.isLockJointActive()).toBe(false);
    expect(world.getStagePhase()).toBe("READY");
    world.free();
  });

  it("allows hoist-up before lock so over-paid cable can be reeled in", async () => {
    const rapier = await initRapier();
    const world = UnloadingScaffoldWorld.create(rapier, 18, 120, "interlock-seed");
    for (let i = 0; i < 60; i += 1) {
      world.step();
    }
    // Pay out cable first.
    world.setControlInput({
      ...createNeutralPlayerInput(),
      hoistAxis: -1,
    });
    for (let i = 0; i < 90; i += 1) {
      world.step();
    }
    const lengthLong = world.getCableTargetLength();
    // Reel back without lock.
    world.setControlInput({
      ...createNeutralPlayerInput(),
      hoistAxis: 1,
    });
    for (let i = 0; i < 90; i += 1) {
      world.step();
    }
    expect(world.getCableTargetLength()).toBeLessThan(lengthLong - 0.3);
    // Unlocked: cask is not rigidly lifted with the empty spreader path.
    expect(world.isLockJointActive()).toBe(false);
    world.free();
  });

  it("lifts the cask with the spreader after lock and enters LIFTING", async () => {
    const rapier = await initRapier();
    const world = UnloadingScaffoldWorld.create(rapier, 18, 120, "lift-seed");
    for (let i = 0; i < 60; i += 1) {
      world.step();
    }
    for (let i = 0; i < 24; i += 1) {
      world.snapSpreaderToCaskLockPose();
      world.step();
    }
    world.setControlInput({
      ...createNeutralPlayerInput(),
      lockPressed: true,
    });
    world.step();
    expect(world.getStagePhase()).toBe("LOCKED");

    const caskBefore = world.getCaskTranslation();
    world.setControlInput({
      ...createNeutralPlayerInput(),
      hoistAxis: 1,
    });
    for (let i = 0; i < 180; i += 1) {
      world.step();
    }
    const caskAfter = world.getCaskTranslation();
    // Y-down: lifting moves the locked cask toward the rail (smaller y).
    expect(caskAfter.y).toBeLessThan(caskBefore.y - 0.3);
    expect(world.getStagePhase()).toBe("LIFTING");
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

  it("reports non-zero instruments while swinging", async () => {
    const rapier = await initRapier();
    const world = UnloadingScaffoldWorld.create(rapier, 18, 120, "hud-seed");
    for (let i = 0; i < 120; i += 1) {
      world.step();
    }
    world.setControlInput({
      ...createNeutralPlayerInput(),
      trolleyAxis: 1,
    });
    for (let i = 0; i < 90; i += 1) {
      world.step();
    }
    world.setControlInput(createNeutralPlayerInput());
    for (let i = 0; i < 30; i += 1) {
      world.step();
    }
    const snap = world.buildSnapshot(240, 0);
    expect(snap.instruments.sway).toBeGreaterThan(0.2);
    expect(snap.instruments.cableLoad).toBeGreaterThan(1);
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

  it("moves trolley and hoist slower when fineMode is on", async () => {
    const rapier = await initRapier();
    const normalWorld = UnloadingScaffoldWorld.create(rapier, 18, 120, "fine-a");
    const fineWorld = UnloadingScaffoldWorld.create(rapier, 18, 120, "fine-b");

    normalWorld.setControlInput({
      ...createNeutralPlayerInput(),
      trolleyAxis: 1,
      hoistAxis: 1,
      fineMode: false,
    });
    fineWorld.setControlInput({
      ...createNeutralPlayerInput(),
      trolleyAxis: 1,
      hoistAxis: 1,
      fineMode: true,
    });

    const normalStartX = normalWorld.getTrolleyX();
    const fineStartX = fineWorld.getTrolleyX();
    const normalStartLen = normalWorld.getCableTargetLength();
    const fineStartLen = fineWorld.getCableTargetLength();

    for (let i = 0; i < 90; i += 1) {
      normalWorld.step();
      fineWorld.step();
    }

    const normalTrolleyDelta = normalWorld.getTrolleyX() - normalStartX;
    const fineTrolleyDelta = fineWorld.getTrolleyX() - fineStartX;
    const normalHoistDelta = normalStartLen - normalWorld.getCableTargetLength();
    const fineHoistDelta = fineStartLen - fineWorld.getCableTargetLength();

    expect(fineTrolleyDelta).toBeLessThan(normalTrolleyDelta * 0.5);
    expect(fineHoistDelta).toBeLessThan(normalHoistDelta * 0.5);

    normalWorld.free();
    fineWorld.free();
  });

  it("raises the locked load when hoist axis is positive", async () => {
    const rapier = await initRapier();
    const world = UnloadingScaffoldWorld.create(rapier, 18, 120, "hoist-seed");
    for (let i = 0; i < 60; i += 1) {
      world.step();
    }
    for (let i = 0; i < 24; i += 1) {
      world.snapSpreaderToCaskLockPose();
      world.step();
    }
    world.setControlInput({
      ...createNeutralPlayerInput(),
      lockPressed: true,
    });
    world.step();
    expect(world.isLockJointActive()).toBe(true);

    const before = world.getSpreaderTranslation();
    const lengthBefore = world.getCableTargetLength();
    world.setControlInput({
      ...createNeutralPlayerInput(),
      hoistAxis: 1,
    });
    for (let i = 0; i < 180; i += 1) {
      world.step();
    }

    const after = world.getSpreaderTranslation();
    expect(world.getCableTargetLength()).toBeLessThan(lengthBefore);
    // Y-down: lifting moves the spreader toward the rail (smaller y).
    expect(after.y).toBeLessThan(before.y);
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
