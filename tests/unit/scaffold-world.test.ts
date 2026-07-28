import { describe, expect, it } from "vitest";
import { createNeutralPlayerInput } from "@/game/protocol";
import { initRapier } from "@/game/simulation/rapierInit";
import { DEFAULT_INTERLOCK_CONFIG } from "@/game/unloading/interlockConfig";
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
    // Crane starts over the quay, not parked above the hold cask.
    expect(world.getTrolleyX()).toBeCloseTo(DEFAULT_UNLOADING_LAYOUT.crane.spreaderSpawnX, 5);
    expect(world.getTrolleyX()).toBeGreaterThan(DEFAULT_UNLOADING_LAYOUT.cask.spawnX + 2);
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
    expect(world.buildSnapshot(100, 0).instruments.locked).toBe(true);
    world.free();
  });

  it("safe-aborts on emergency stop (E)", async () => {
    const rapier = await initRapier();
    const world = UnloadingScaffoldWorld.create(rapier, 18, 120, "estop-seed");
    world.step();
    world.setControlInput({
      ...createNeutralPlayerInput(),
      emergencyStopPressed: true,
    });
    world.step();
    expect(world.getStagePhase()).toBe("SAFE_ABORTED");
    expect(world.getAbortReason()).toBe("E_STOP");
    expect(world.buildSnapshot(2, 0).abortReason).toBe("E_STOP");
    // Control is frozen after abort.
    const x0 = world.getTrolleyX();
    world.setControlInput({
      ...createNeutralPlayerInput(),
      trolleyAxis: 1,
    });
    for (let i = 0; i < 60; i += 1) {
      world.step();
    }
    expect(world.getTrolleyX()).toBeCloseTo(x0, 3);
    world.free();
  });

  it("safe-aborts when the cask leaves world bounds", async () => {
    const rapier = await initRapier();
    const interlock = {
      ...DEFAULT_INTERLOCK_CONFIG,
      worldBounds: {
        minX: -1,
        maxX: 1,
        minY: -1,
        maxY: 1,
      },
    };
    const world = UnloadingScaffoldWorld.create(
      rapier,
      18,
      120,
      "bounds-seed",
      DEFAULT_UNLOADING_LAYOUT,
      undefined,
      undefined,
      interlock,
    );
    // Cask spawns far outside the tiny bounds → abort on first safety check.
    for (let i = 0; i < 5; i += 1) {
      world.step();
      if (world.getStagePhase() === "SAFE_ABORTED") {
        break;
      }
    }
    expect(world.getStagePhase()).toBe("SAFE_ABORTED");
    expect(world.getAbortReason()).toMatch(/OUT_OF_BOUNDS/);
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

  it("lifts the cask after lock through LIFTING into CLEAR_OF_HOLD", async () => {
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

    let sawLifting = false;
    for (let i = 0; i < 90; i += 1) {
      world.step();
      if (world.getStagePhase() === "LIFTING") {
        sawLifting = true;
      }
    }
    expect(sawLifting).toBe(true);
    expect(world.getCaskTranslation().y).toBeLessThan(caskBefore.y - 0.2);

    for (let i = 0; i < 240; i += 1) {
      world.step();
    }
    // High enough that the cask center is clear of the hold mouth.
    expect(world.getStagePhase()).toBe("CLEAR_OF_HOLD");
    world.free();
  });

  it("traverses after clear-of-hold and enters LANDING over the cradle", async () => {
    const rapier = await initRapier();
    const world = UnloadingScaffoldWorld.create(rapier, 18, 120, "traverse-seed");
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

    world.setControlInput({
      ...createNeutralPlayerInput(),
      hoistAxis: 1,
    });
    for (let i = 0; i < 360; i += 1) {
      world.step();
      if (world.getStagePhase() === "CLEAR_OF_HOLD") {
        break;
      }
    }
    expect(world.getStagePhase()).toBe("CLEAR_OF_HOLD");

    // Move toward the quay cradle (positive X); stop hoist so length holds.
    world.setControlInput({
      ...createNeutralPlayerInput(),
      trolleyAxis: 1,
    });
    let sawTraversing = false;
    for (let i = 0; i < 900; i += 1) {
      world.step();
      const phase = world.getStagePhase();
      if (phase === "TRAVERSING") {
        sawTraversing = true;
      }
      if (phase === "LANDING") {
        break;
      }
    }
    expect(sawTraversing).toBe(true);
    expect(world.getStagePhase()).toBe("LANDING");
    expect(
      Math.abs(world.getTrolleyX() - DEFAULT_UNLOADING_LAYOUT.cradle.centerX),
    ).toBeLessThanOrEqual(DEFAULT_UNLOADING_LAYOUT.cradle.halfWidth + 0.05);
    world.free();
  });

  it("seats the load on the cradle after landing and lowering", async () => {
    const rapier = await initRapier();
    // Short seat hold for a faster integration test.
    const interlock = {
      ...DEFAULT_INTERLOCK_CONFIG,
      seatStableTicks: 12,
    };
    const world = UnloadingScaffoldWorld.create(
      rapier,
      18,
      120,
      "seat-seed",
      DEFAULT_UNLOADING_LAYOUT,
      undefined,
      undefined,
      interlock,
    );
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

    world.setControlInput({
      ...createNeutralPlayerInput(),
      hoistAxis: 1,
    });
    for (let i = 0; i < 400; i += 1) {
      world.step();
      if (world.getStagePhase() === "CLEAR_OF_HOLD") {
        break;
      }
    }
    expect(world.getStagePhase()).toBe("CLEAR_OF_HOLD");

    world.setControlInput({
      ...createNeutralPlayerInput(),
      trolleyAxis: 1,
    });
    for (let i = 0; i < 900; i += 1) {
      world.step();
      if (world.getStagePhase() === "LANDING") {
        break;
      }
    }
    expect(world.getStagePhase()).toBe("LANDING");

    // Locked careful placement → SEATED, not complete until unlock.
    world.setControlInput(createNeutralPlayerInput());
    for (let i = 0; i < 40; i += 1) {
      world.snapLoadOntoCradlePad();
      world.step();
      if (world.getStagePhase() === "SEATED") {
        break;
      }
    }
    expect(world.getStagePhase()).toBe("SEATED");
    expect(world.isLockJointActive()).toBe(true);
    expect(world.buildSnapshot(1, 0).instruments.locked).toBe(true);

    world.setControlInput({
      ...createNeutralPlayerInput(),
      lockPressed: true,
    });
    world.step();
    expect(world.isLockJointActive()).toBe(false);
    expect(world.getStagePhase()).toBe("COMPLETED");
    world.free();
  });

  it("completes when a free cask settles straight on the cradle pad", async () => {
    const rapier = await initRapier();
    const interlock = {
      ...DEFAULT_INTERLOCK_CONFIG,
      seatStableTicks: 12,
    };
    const world = UnloadingScaffoldWorld.create(
      rapier,
      18,
      120,
      "drop-seat-seed",
      DEFAULT_UNLOADING_LAYOUT,
      undefined,
      undefined,
      interlock,
    );
    // No lock — place free cask on the pad and hold still.
    for (let i = 0; i < 30; i += 1) {
      world.snapLoadOntoCradlePad();
      world.step();
      if (world.getStagePhase() === "COMPLETED") {
        break;
      }
    }
    expect(world.getStagePhase()).toBe("COMPLETED");
    expect(world.isLockJointActive()).toBe(false);
    world.free();
  });

  it("unlocks from any phase with Space and allows re-lock", async () => {
    const rapier = await initRapier();
    const world = UnloadingScaffoldWorld.create(rapier, 18, 120, "relock-seed");
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
    expect(world.getStagePhase()).toBe("LOCKED");

    // Unlock while still in LOCKED (anywhere unlock).
    world.setControlInput({
      ...createNeutralPlayerInput(),
      lockPressed: true,
    });
    world.step();
    expect(world.isLockJointActive()).toBe(false);
    expect(world.getStagePhase()).toBe("READY");
    expect(world.buildSnapshot(1, 0).instruments.locked).toBe(false);

    // Re-align and lock again.
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
    world.free();
  });

  it("slows trolley traverse while locked load is still low in the hold", async () => {
    const rapier = await initRapier();
    const freeWorld = UnloadingScaffoldWorld.create(rapier, 18, 120, "trolley-free");
    const lockedWorld = UnloadingScaffoldWorld.create(rapier, 18, 120, "trolley-locked");

    for (let i = 0; i < 60; i += 1) {
      freeWorld.step();
      lockedWorld.step();
    }
    for (let i = 0; i < 24; i += 1) {
      lockedWorld.snapSpreaderToCaskLockPose();
      lockedWorld.step();
    }
    lockedWorld.setControlInput({
      ...createNeutralPlayerInput(),
      lockPressed: true,
    });
    lockedWorld.step();
    expect(lockedWorld.isLockJointActive()).toBe(true);
    expect(lockedWorld.getStagePhase()).toBe("LOCKED");

    const freeStart = freeWorld.getTrolleyX();
    const lockedStart = lockedWorld.getTrolleyX();
    freeWorld.setControlInput({
      ...createNeutralPlayerInput(),
      trolleyAxis: 1,
    });
    lockedWorld.setControlInput({
      ...createNeutralPlayerInput(),
      trolleyAxis: 1,
    });
    for (let i = 0; i < 90; i += 1) {
      freeWorld.step();
      lockedWorld.step();
    }

    const freeDelta = freeWorld.getTrolleyX() - freeStart;
    const lockedDelta = lockedWorld.getTrolleyX() - lockedStart;
    // lowClearanceTrolleySpeedScale default 0.22 → locked traverse much slower.
    expect(lockedDelta).toBeLessThan(freeDelta * 0.5);
    freeWorld.free();
    lockedWorld.free();
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
