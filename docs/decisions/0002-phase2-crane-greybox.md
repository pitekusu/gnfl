# 0002 — Phase 2 crane greybox architecture

## Status

Accepted for Phase 2 (unloading greybox crane).

## Context

Phase 1 proved Worker + Rapier + Phaser snapshots. Phase 2 adds the moored-ship
unloading greybox: quay, cradle, ship motion, trolley, dual-cable spreader, free
cask, and keyboard control — without locking, weather events, or scoring.

## Decisions

### Physics ownership

- Rapier World remains only inside the simulation module worker.
- Trolley is kinematic on a fixed rail (`railY`).
- Spreader is dynamic; two tension-only spring-damper cables attach trolley → spreader.
- Cable forces use stretch + separation-rate damping; compression is never applied.
- Ship is kinematic with seeded low-frequency heave/pitch; hold colliders are local
  to the ship (no solid outer hull collider so the free cask is not trapped).
- Cask is dynamic and unlocked (locking is Phase 3).

### Control

- Phaser maps keyboard → `PlayerInput` (device keys never reach the worker).
- Worker latches the latest INPUT each physics tick.
- Fine mode (`Shift`) multiplies trolley/hoist max speeds (~0.28); using it is not a
  score penalty by itself (scoring lands later).
- Mouse levers are deferred (not required for Phase 2 DoD).

### Presentation

- Greybox rectangles only; colliders stay separate from art.
- Ship is drawn translucent so the hold cask is visible.
- React DOM overlays show **緩速状態**, **振れ**, and **張力** (Phaser camera zoom
  made in-canvas text unreliable).
- Idle **張力 ≈ 20** is expected: steady hang load supporting the spreader mass.
- **振れ** is primarily trolley–spreader lateral offset (plus a speed term).

### Layout

- Default layout keeps ship fully left of the quay left edge (water gap ≥ 1.5).
- Layout and crane tunables are Zod-validated in `src/game/unloading/`.

## Phase 2 DoD (manual)

1. Suspended load swings (spreader lags trolley).
2. Hard stop increases swing.
3. Fine mode enables slower, finer positioning.

## Out of scope (later phases)

| Topic                             | Phase |
| --------------------------------- | ----- |
| Lock / seat / stage state machine | 3     |
| Gust / high-wave events           | 4     |
| Scoring / results                 | 5     |
| Online ranking / AWS deploy       | 6–7   |
| Final art                         | 8     |

## Consequences

- Phase 3 can add joints/lock without rewriting the cable force model.
- Weather can multiply ship motion via `highWaveEnvelope` already plumbed.
- Tuning cable `stiffness` / `damping` / masses will change idle 張力 and swing feel.
