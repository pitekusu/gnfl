# 0005 — Phase 5 scoring and local results

## Status

Accepted for the Phase 5 scoring PR (metrics → shared score → result screen).

## Context

Phase 3 delivers lock → seat → complete / safe abort. Continuous sea/wind
(ADR 0004) is ambient difficulty only. Players still get no grade after a run.

Implementation directive §11 and Phase 5 require:

- Collect unloading **metrics** during play (game units, not plant units).
- Score via **pure functions** shared with future Lambda (`shared/`).
- Show a **result screen** with rank/categories; **no timer** on the play HUD.
- `SAFE_ABORTED` is not score-submittable.
- AWS ranking / POST score is **Phase 6** (out of scope here).

Placeholders already exist: `UnloadingMetrics`, `StageResult`, worker message
types `COMPLETED` / `ABORTED`. They are not wired end-to-end yet.

## Decisions

### Metrics first, score second

- Accumulate raw `UnloadingMetrics` every physics tick (or snapshot-rate
  aggregates that are tick-accurate for counts).
- Score only when the stage reaches `COMPLETED`.
- Abort runs keep metrics for debug/UI but show “登録不可”, not a grade.

### Shared pure scoring

- Put Zod contracts, ruleset thresholds, and `scoreUnloading(metrics)` under
  `shared/` (alias `@shared/*` already configured).
- Client and (later) Lambda import the same functions; Lambda never trusts a
  client-sent final score.
- `rulesetVersion` (e.g. `unloading-v1`) versions thresholds; changing thresholds
  bumps the version so rankings do not mix.

### Categories and rank (directive §11)

| Category             | Weight |
| -------------------- | -----: |
| Handling quality     |    30% |
| Landing precision    |    25% |
| Sway control         |    20% |
| Equipment care       |    15% |
| Operation efficiency |    10% |

- Each category → 0–100; weighted overall → `score = round(clamp(overall,0,100)*1000)`
  (0–100_000 integer).
- Letter ranks: S+ / S / A / B / C / D / E per directive bands.
- Result UI shows overall rank + score + category **letter** grades, not raw
  physics dumps or elapsed seconds.

### Local-only personal best (Phase 5)

- Optional `localStorage` personal best for this browser (and anonymous
  `playerId` if needed for continuity).
- No network submit. Phase 6 replaces with DynamoDB + API.

### No play-screen timer

- Do not display elapsed time, countdown, or tick counts on the game HUD.
- `elapsedTicks` remains an internal metric for operation-efficiency scoring only.

## Out of scope

| Topic                        | Where   |
| ---------------------------- | ------- |
| POST score / leaderboard API | Phase 6 |
| DynamoDB / Lambda            | Phase 6 |
| Domain / CD                  | Phase 7 |
| Art polish on result screen  | Phase 8 |
| Threshold balance pass       | Phase 9 |

## Consequences

- Careful play scores higher than rushed play (weights favor quality over speed).
- Unit tests can pin score fixtures without physics.
- Phase 6 only adds transport + persistence around the same scorer.

## Commit plan (fine-grained)

1. This ADR (scope only).
2. `shared` metrics Zod schema (+ align protocol re-exports).
3. Scoring ruleset config (`unloading-v1` thresholds / weights / grade bands).
4. Pure category scorers + overall score + letter grade.
5. Pure metrics accumulator (tick update helpers).
6. Wire accumulator into `UnloadingScaffoldWorld`.
7. Terminal `StageResult` + worker `COMPLETED` / `ABORTED` emission.
8. Main-thread surface of stage end (client / scene / React bridge).
9. Result screen UI (rank, score, categories; no timer).
10. App flow: game → result (retry / title).
11. Local personal-best compare (localStorage).
12. README + PR polish.
