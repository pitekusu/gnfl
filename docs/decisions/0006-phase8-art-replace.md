# 0006 — Phase 8 art replacement (greybox → approved visuals)

## Status

Accepted for the Phase 8 art PR. **Phase 6 (AWS ranking) and Phase 7 (domain/CD)
are deferred** until after playable art and feel passes; they remain production work.

## Context

Phases 0–5 deliver a playable unloading greybox: physics, stage machine, continuous
sea/wind, metrics, local scoring, and result UI. Presentation is still rectangles and
flat fills (`SimulationScene` rectangles, `drawUnloadingScenery` graphics).

Implementation directive Phase 8:

- ChatGPT backgrounds
- Codex/agent SVG for movable objects
- Phaser effects (wires, mist, sea surface, windsock, etc.)
- UI polish
- Audio (optional for first pass)

**Completion criterion:** replace provisional shapes with formal display assets
**without changing physics colliders** (layout sizes stay authoritative).

Art direction source: `docs/gnfl-ChatGPT-Design-Directive.md`.

## Decisions

### Defer production backend

- Do **not** start DynamoDB / Lambda / CloudFront domain work in this PR series.
- Ranking API and public deploy stay Phase 6–7 after art + Phase 9 balance, or when
  explicitly re-prioritized.

### Display vs physics separation

- Rapier colliders and `UnloadingLayout` half-extents remain the truth.
- Display assets **align** to snapshot entity pose/size; never generate colliders
  from SVG paths.
- Greybox rectangles remain a **fallback** when a texture/SVG is missing (safe boot).

### Role split (unchanged from art directive)

| Owner                         | Deliverable                                                              |
| ----------------------------- | ------------------------------------------------------------------------ |
| ChatGPT / human art direction | Berth background, sky/fog, sea reference plates                          |
| Agents (SVG)                  | Ship, crane, trolley, spreader, cask, cradle, UI chrome pieces           |
| Phaser runtime                | Cables, guide lines, needles, spray/mist particles, water surface motion |
| React/CSS                     | Title / result / later ranking chrome                                    |

### Asset layout

```text
public/assets/unloading/
  backgrounds/     # WebP/PNG plates (optional at first)
  svg/             # Movable + static SVG
art/
  reference/       # Mood refs (not shipped if large)
  source/          # Working files
  asset-notes.md   # Pivots, viewBox, scale notes
  prompts.md
```

Vite serves from `public/`. Prefer SVG for interactive pieces; raster only for full-bleed backdrop.

### Ship layering

Ship is not a single flat box:

1. Hull rear (behind cask when in hold)
2. Hold interior (optional)
3. Hold foreground mask (so the load reads as inside the hatch)

Depth order must match current greybox intent (cask visible in hold).

### Scope for this PR (incremental)

Land infrastructure + first SVG/sprite swap + layered ship + backdrop slot + light FX,
then UI chrome. Full ChatGPT master plates can land as files when available without
blocking SVG/entity work.

## Out of scope

| Topic                            | Where   |
| -------------------------------- | ------- |
| POST score / leaderboard API     | Phase 6 |
| DynamoDB / Lambda / CDN domain   | Phase 7 |
| Score threshold rebalance        | Phase 9 |
| Mouse levers (if still deferred) | Later   |
| Opening/ending cinematics        | Out     |

## Consequences

- Players get readable industrial visuals while sim stays stable.
- Missing assets do not crash the sim (rectangle fallback).
- Backend work is intentionally sequenced after presentation.

## Commit plan (fine-grained)

1. This ADR (scope: Phase 8; Phase 6–7 deferred).
2. Asset path conventions + `art/asset-notes` skeleton for pivots.
3. Entity display registry (`kind` → texture key / depth / origin).
4. Minimal industrial SVG set for cask, spreader, trolley, cradle, ship hull.
5. `SimulationScene`: prefer Image/Sprite over Rectangle when texture loaded.
6. Ship layering (rear + foreground mask) from layout sizes.
7. Static berth: backdrop image slot + keep rail/bumper graphics until SVG gantry.
8. Phaser FX: simple sea surface motion (no fluid sim); optional windsock later.
9. Cable draw polish (width/shadow already present — light style pass).
10. React/CSS chrome pass (title + result mood, no baked text in images).
11. Optional audio hooks (muted default; no hard dependency).
12. README + PR polish.
