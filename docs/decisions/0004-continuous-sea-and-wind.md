# 0004 — Continuous sea state and wind (no weather events)

## Status

Accepted for the continuous-environment PR (replaces discrete Phase 4 weather events).

## Context

The original Phase 4 plan called for seeded gusts, high-wave clusters, precursors,
and fairness constraints so players could react. Product direction changed:

- **Do not** implement discrete weather events or precursor UI.
- **Do** make ordinary wave motion larger and time-varying.
- **Do** apply a continuous wind whose strength changes randomly (seeded) so the
  hanging load always feels pushed around.

Phase 3 already ships lock → lift → seat → complete. This work only changes the
ambient sea/wind environment around that loop.

## Decisions

### No event weather

- No gust/high-wave event scheduler.
- No precursor timers or “incoming weather” HUD.
- `highWaveEnvelope`-style event multipliers are not the primary API; continuous
  amplitude comes from config + seeded time-varying envelope instead.

### Deterministic “random”

- All variation is derived from the gameplay `seed` and elapsed time.
- Same seed + time ⇒ same ship pose and wind (no `Math.random` in the sim path).
- Prefer pure sampling functions tested with unit tests.

### Waves (ship)

- Keep the ship **kinematic**.
- Enlarge multi-sine heave/pitch and add a slow seeded envelope so wave “size”
  breathes over time.
- Still no fluid simulation or floating Dynamic hull.

### Wind (load)

- Continuous horizontal (and optional small vertical) force on the hanging load.
- Strength varies smoothly over time from a seeded field (low-frequency + noise).
- Apply primarily to the spreader; when locked, the joint carries the cask with it.

### Presentation

- Expose `weather.waveHint` / `weather.windHint` (and optional HUD) in later commits
  of this PR; greybox only, no particle VFX required for DoD.

## Out of scope

| Topic                        | Where     |
| ---------------------------- | --------- |
| Discrete gust / high-wave UX | Dropped   |
| Precursor UI                 | Dropped   |
| Scoring from wind/wave       | Phase 5   |
| Spray / art weather FX       | Later art |

## Consequences

- Difficulty comes from always-on motion, not scripted spikes.
- Fairness is “same seed ⇒ same run,” not event-window rules.
- Implementation can land as small pure-function commits (config → wave → wind → wire → HUD).

## Commit plan (fine-grained)

1. This ADR (scope only).
2. Seeded unit float / noise helpers.
3. Wave environment Zod config.
4. Larger, time-varying `sampleBaseShipMotion` (or successor).
5. Wire wave config into `UnloadingScaffoldWorld` + `waveHint`.
6. Wind environment Zod config.
7. Pure continuous `sampleWind`.
8. Apply wind force to hanging load.
9. HUD / instruments for wind and wave.
10. README + PR polish.
