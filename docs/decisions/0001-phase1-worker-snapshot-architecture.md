# 0001 — Phase 1 worker / snapshot architecture

## Status

Accepted for Phase 1 (greybox falling box).

## Context

GNFL runs Rapier physics off the main thread and draws with Phaser. React must
not receive per-frame physics state.

## Decision

- Rapier World lives only inside the simulation module worker.
- Physics steps at fixed 120 Hz with accumulator catch-up capped at 8 ticks.
- Worker posts `RenderSnapshot` at 60 Hz over `postMessage` (no SharedArrayBuffer).
- Phaser keeps a two-slot snapshot buffer and interpolates for display frames.
- React receives only low-frequency status (`ready` / `error`).
- Tab hidden → `PAUSE`; scene destroy → `DISPOSE` + `worker.terminate()`.

## Consequences

- Crane / weather / scoring stay out of Phase 1.
- Browser float differences are acceptable; full determinism is not required.
- Later phases can raise snapshot Hz only if measured improvement justifies it.
