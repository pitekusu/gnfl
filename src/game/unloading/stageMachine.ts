import type { StagePhase } from "@/game/protocol";

/**
 * Pure unloading stage state machine (no Rapier).
 * Later commits emit these events from physics / input.
 */

export type StageMachineEvent =
  | { type: "ALIGNMENT_LOST" }
  | { type: "ALIGNMENT_OK" }
  | { type: "LOCK_SUCCESS" }
  | { type: "BREAKOUT_LIFT" }
  | { type: "CLEARED_HOLD" }
  | { type: "BEGIN_TRAVERSE" }
  | { type: "OVER_CRADLE" }
  | { type: "SEAT_STABLE" }
  /** Cask left the cradle pad after SEATED (e.g. hoisted up again). */
  | { type: "SEAT_LOST" }
  | { type: "UNLOCK_CONFIRMED" }
  | { type: "COMPLETE_CONFIRMED" }
  | { type: "SAFE_ABORT"; reason: string };

export interface StageMachineState {
  phase: StagePhase;
  /** Set when entering SAFE_ABORTED. */
  abortReason: string | null;
  /** Monotonic transition count (debug / tests). */
  transitionCount: number;
}

export function createInitialStageMachineState(): StageMachineState {
  return {
    phase: "READY",
    abortReason: null,
    transitionCount: 0,
  };
}

export interface StageReduceResult {
  state: StageMachineState;
  /** False when the event was ignored (illegal or no-op for current phase). */
  accepted: boolean;
}

/**
 * Reduce stage phase by event. Terminal phases ignore further progress events;
 * SAFE_ABORT is always accepted from non-terminal phases (and is a no-op if already aborted).
 */
export function reduceStage(
  state: StageMachineState,
  event: StageMachineEvent,
): StageReduceResult {
  if (event.type === "SAFE_ABORT") {
    if (state.phase === "SAFE_ABORTED" || state.phase === "COMPLETED") {
      return { state, accepted: false };
    }
    return {
      accepted: true,
      state: {
        phase: "SAFE_ABORTED",
        abortReason: event.reason,
        transitionCount: state.transitionCount + 1,
      },
    };
  }

  if (state.phase === "COMPLETED" || state.phase === "SAFE_ABORTED") {
    return { state, accepted: false };
  }

  const next = nextPhase(state.phase, event);
  if (next === null) {
    return { state, accepted: false };
  }

  return {
    accepted: true,
    state: {
      phase: next,
      abortReason: null,
      transitionCount: state.transitionCount + 1,
    },
  };
}

/** Phases where the load may still be joint-locked and Space can unlock. */
const UNLOCKABLE_PHASES = new Set<StagePhase>([
  "LOCKED",
  "LIFTING",
  "CLEAR_OF_HOLD",
  "TRAVERSING",
  "LANDING",
  "SEATED",
]);

function nextPhase(phase: StagePhase, event: StageMachineEvent): StagePhase | null {
  // Unlock is allowed from any post-lock phase and returns to READY for re-lock.
  if (event.type === "UNLOCK_CONFIRMED") {
    return UNLOCKABLE_PHASES.has(phase) ? "READY" : null;
  }

  // Straight seating on the cradle pad can complete from any active phase
  // (lower carefully or drop from above — stability is checked in physics).
  if (event.type === "SEAT_STABLE") {
    if (
      phase === "COMPLETED" ||
      phase === "SAFE_ABORTED" ||
      phase === "SEATED"
    ) {
      return null;
    }
    return "SEATED";
  }

  switch (phase) {
    case "READY":
      if (event.type === "ALIGNMENT_OK") {
        return "ALIGNING";
      }
      return null;

    case "ALIGNING":
      if (event.type === "ALIGNMENT_LOST") {
        return "READY";
      }
      if (event.type === "LOCK_SUCCESS") {
        return "LOCKED";
      }
      return null;

    case "LOCKED":
      if (event.type === "BREAKOUT_LIFT") {
        return "LIFTING";
      }
      return null;

    case "LIFTING":
      if (event.type === "CLEARED_HOLD") {
        return "CLEAR_OF_HOLD";
      }
      return null;

    case "CLEAR_OF_HOLD":
      if (event.type === "BEGIN_TRAVERSE") {
        return "TRAVERSING";
      }
      // Allow direct OVER_CRADLE if already over seat when cleared.
      if (event.type === "OVER_CRADLE") {
        return "LANDING";
      }
      return null;

    case "TRAVERSING":
      if (event.type === "OVER_CRADLE") {
        return "LANDING";
      }
      return null;

    case "LANDING":
      // Left the cradle zone while still landing.
      if (event.type === "BEGIN_TRAVERSE") {
        return "TRAVERSING";
      }
      return null;

    case "SEATED":
      // Lifted off the pad again while still carrying — re-enter landing/traverse.
      if (event.type === "SEAT_LOST") {
        return "LANDING";
      }
      if (event.type === "BEGIN_TRAVERSE") {
        return "TRAVERSING";
      }
      if (event.type === "COMPLETE_CONFIRMED") {
        return "COMPLETED";
      }
      return null;

    default:
      return null;
  }
}

/** Happy-path event sequence for tests and docs. */
export const HAPPY_PATH_EVENTS: readonly StageMachineEvent[] = [
  { type: "ALIGNMENT_OK" },
  { type: "LOCK_SUCCESS" },
  { type: "BREAKOUT_LIFT" },
  { type: "CLEARED_HOLD" },
  { type: "BEGIN_TRAVERSE" },
  { type: "OVER_CRADLE" },
  { type: "SEAT_STABLE" },
  { type: "COMPLETE_CONFIRMED" },
] as const;

export function applyStageEvents(
  initial: StageMachineState,
  events: readonly StageMachineEvent[],
): StageMachineState {
  let state = initial;
  for (const event of events) {
    const result = reduceStage(state, event);
    if (result.accepted) {
      state = result.state;
    }
  }
  return state;
}
