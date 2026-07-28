# 0003 — Phase 3 unloading stage (lock / seat / state machine)

## Status

Accepted for Phase 3 (unloading greybox stage flow).

## Context

Phase 2 delivered trolley, dual-cable spreader, free cask, and ship motion.
Phase 3 wires the full unloading procedure with a pure stage machine and
physics-driven events.

## Decisions

### Stage machine

- Pure reducer in `stageMachine.ts` owns legal transitions only.
- Physics / input emit events (`LOCK_SUCCESS`, `CLEARED_HOLD`, `SEAT_STABLE`, …).
- Terminal phases: `COMPLETED`, `SAFE_ABORTED`.

### Lock

- Alignment is pure (`evaluateLockAlignment`); stable ticks → `lockReady`.
- Space engages a Rapier **fixed** joint (spreader ↔ cask).
- Unlock is allowed in any post-lock phase; mid-carry unlock returns to `READY`.
- On `SEATED`, unlock completes the stage (careful placement).

### Completion

- **Free / dropped** seating: stable pad contact → auto `COMPLETED`.
- **Locked** seating: `SEATED` until Space unlock → `COMPLETED`.

### Interlocks / safety

- Low clearance slows trolley while a locked load is still in the hold.
- Extreme cable tension cuts hoist-up only.
- E-stop, out-of-bounds, and runaway speed → `SAFE_ABORTED` with `abortReason`.

### Spawn

- Crane starts over the **quay**, not over the ship hold.

## Out of scope (later phases)

| Topic            | Phase |
| ---------------- | ----- |
| Weather events   | 4     |
| Scoring / result | 5     |
| Ranking / AWS    | 6–7   |
| Final art        | 8     |

## Consequences

- Greybox can run lock → lift → traverse → seat → complete without real plant art.
- Scoring can attach to existing stage events and `unloadingMetrics` later.
