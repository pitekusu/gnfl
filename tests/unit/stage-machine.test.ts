import { describe, expect, it } from "vitest";
import {
  HAPPY_PATH_EVENTS,
  applyStageEvents,
  createInitialStageMachineState,
  reduceStage,
  type StageMachineEvent,
} from "@/game/unloading/stageMachine";

describe("reduceStage", () => {
  it("starts in READY", () => {
    expect(createInitialStageMachineState().phase).toBe("READY");
  });

  it("follows the happy path to COMPLETED", () => {
    const end = applyStageEvents(createInitialStageMachineState(), HAPPY_PATH_EVENTS);
    expect(end.phase).toBe("COMPLETED");
    expect(end.transitionCount).toBe(HAPPY_PATH_EVENTS.length);
  });

  it("returns to READY when alignment is lost while aligning", () => {
    let state = createInitialStageMachineState();
    state = reduceStage(state, { type: "ALIGNMENT_OK" }).state;
    expect(state.phase).toBe("ALIGNING");
    state = reduceStage(state, { type: "ALIGNMENT_LOST" }).state;
    expect(state.phase).toBe("READY");
  });

  it("rejects illegal transitions", () => {
    const state = createInitialStageMachineState();
    const result = reduceStage(state, { type: "LOCK_SUCCESS" });
    expect(result.accepted).toBe(false);
    expect(result.state.phase).toBe("READY");
  });

  it("accepts SAFE_ABORT from an active phase", () => {
    let state = createInitialStageMachineState();
    state = reduceStage(state, { type: "ALIGNMENT_OK" }).state;
    const aborted = reduceStage(state, {
      type: "SAFE_ABORT",
      reason: "E_STOP",
    });
    expect(aborted.accepted).toBe(true);
    expect(aborted.state.phase).toBe("SAFE_ABORTED");
    expect(aborted.state.abortReason).toBe("E_STOP");
  });

  it("ignores progress events after COMPLETED", () => {
    const completed = applyStageEvents(
      createInitialStageMachineState(),
      HAPPY_PATH_EVENTS,
    );
    const result = reduceStage(completed, { type: "ALIGNMENT_OK" });
    expect(result.accepted).toBe(false);
    expect(result.state.phase).toBe("COMPLETED");
  });

  it("ignores SAFE_ABORT after COMPLETED", () => {
    const completed = applyStageEvents(
      createInitialStageMachineState(),
      HAPPY_PATH_EVENTS,
    );
    const result = reduceStage(completed, {
      type: "SAFE_ABORT",
      reason: "too-late",
    });
    expect(result.accepted).toBe(false);
    expect(result.state.phase).toBe("COMPLETED");
  });

  it("can skip BEGIN_TRAVERSE when already over cradle after clear", () => {
    const events: StageMachineEvent[] = [
      { type: "ALIGNMENT_OK" },
      { type: "LOCK_SUCCESS" },
      { type: "BREAKOUT_LIFT" },
      { type: "CLEARED_HOLD" },
      { type: "OVER_CRADLE" },
      { type: "SEAT_STABLE" },
      { type: "COMPLETE_CONFIRMED" },
    ];
    const end = applyStageEvents(createInitialStageMachineState(), events);
    expect(end.phase).toBe("COMPLETED");
  });

  it("allows returning to TRAVERSING from LANDING", () => {
    let state = applyStageEvents(createInitialStageMachineState(), [
      { type: "ALIGNMENT_OK" },
      { type: "LOCK_SUCCESS" },
      { type: "BREAKOUT_LIFT" },
      { type: "CLEARED_HOLD" },
      { type: "BEGIN_TRAVERSE" },
      { type: "OVER_CRADLE" },
    ]);
    expect(state.phase).toBe("LANDING");
    state = reduceStage(state, { type: "BEGIN_TRAVERSE" }).state;
    expect(state.phase).toBe("TRAVERSING");
  });

  it("returns from SEATED to LANDING when seat is lost", () => {
    let state = applyStageEvents(createInitialStageMachineState(), [
      { type: "ALIGNMENT_OK" },
      { type: "LOCK_SUCCESS" },
      { type: "BREAKOUT_LIFT" },
      { type: "CLEARED_HOLD" },
      { type: "OVER_CRADLE" },
      { type: "SEAT_STABLE" },
    ]);
    expect(state.phase).toBe("SEATED");
    state = reduceStage(state, { type: "SEAT_LOST" }).state;
    expect(state.phase).toBe("LANDING");
  });

  it("returns to READY on unlock from any post-lock phase", () => {
    for (const mid of [
      [{ type: "ALIGNMENT_OK" as const }, { type: "LOCK_SUCCESS" as const }],
      [
        { type: "ALIGNMENT_OK" as const },
        { type: "LOCK_SUCCESS" as const },
        { type: "BREAKOUT_LIFT" as const },
      ],
      [
        { type: "ALIGNMENT_OK" as const },
        { type: "LOCK_SUCCESS" as const },
        { type: "BREAKOUT_LIFT" as const },
        { type: "CLEARED_HOLD" as const },
      ],
    ]) {
      let state = applyStageEvents(createInitialStageMachineState(), mid);
      state = reduceStage(state, { type: "UNLOCK_CONFIRMED" }).state;
      expect(state.phase).toBe("READY");
    }
  });
});
