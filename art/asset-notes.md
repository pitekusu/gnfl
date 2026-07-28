# Asset notes (unloading stage)

## Roles

| Kind                                         | Owner                        | Runtime                  |
| -------------------------------------------- | ---------------------------- | ------------------------ |
| Berth / sky / fog plates                     | ChatGPT / art direction      | Phaser Image (backdrop)  |
| Ship, crane, trolley, spreader, cask, cradle | Agent SVG                    | Phaser Image / Container |
| Cables, mist, spray, needles                 | Phaser graphics              | Runtime draw             |
| Title / result chrome                        | React + CSS (+ optional SVG) | DOM                      |

- Do **not** bake text, numbers, or logos into bitmaps.
- **Colliders stay in code** (`UnloadingLayout` + Rapier). Never derive hitboxes from SVG paths.

## On-disk layout

```text
public/assets/unloading/          # served at /assets/unloading/
  backgrounds/                    # optional WebP/PNG full-bleed
    berth_backdrop.webp           # (when available)
  svg/                            # movable + static SVG
    ship_body_rear.svg
    ship_hold_foreground.svg
    crane_gantry.svg
    crane_trolley.svg
    hoist_unit.svg
    spreader.svg
    transport_cask.svg
    transporter_body.svg
    seating_frame_rear.svg
    seating_frame_front.svg
    windsock.svg

art/
  reference/                      # mood refs (not required in ship)
  source/                         # working files
  asset-notes.md                  # this file
  prompts.md                      # ChatGPT prompts

src/game/phaser/unloadingAssetPaths.ts   # URL + texture key constants
```

Canonical path helpers live in code so loaders and tests do not hard-code strings.

## SVG rules (summary)

- Valid `viewBox`; avoid fixed-only width/height px.
- No embedded fonts, base64 images, or heavy filters.
- Meaningful English group ids.
- Shared viewBox for front/rear ship split when possible.
- See `docs/gnfl-ChatGPT-Design-Directive.md` §10.

## Pivot / origin skeleton

Phaser default origin is `(0.5, 0.5)` (center). Record exceptions here when SVGs land.
Game-unit half extents still come from layout; display scale fits snapshot `width`/`height`.

| Asset                      | Texture key                      | Default origin | Pivot notes                         |
| -------------------------- | -------------------------------- | -------------- | ----------------------------------- |
| `ship_body_rear.svg`       | `unloading-ship-body-rear`       | 0.5, 0.5       | Hull center ≈ ship body center      |
| `ship_hold_foreground.svg` | `unloading-ship-hold-foreground` | 0.5, 0.5       | Same pose as ship; higher depth     |
| `crane_gantry.svg`         | `unloading-crane-gantry`         | 0.5, 0.5       | Static; align to rail span          |
| `crane_trolley.svg`        | `unloading-crane-trolley`        | 0.5, 0.5       | Follow trolley snapshot             |
| `hoist_unit.svg`           | `unloading-hoist-unit`           | 0.5, 0.5       | Optional; may parent to trolley     |
| `spreader.svg`             | `unloading-spreader`             | 0.5, 0.5       | Cable attach at top center (visual) |
| `transport_cask.svg`       | `unloading-transport-cask`       | 0.5, 0.5       | Slight asymmetric mark for roll     |
| `transporter_body.svg`     | `unloading-transporter-body`     | 0.5, 0.5       | Quay cradle vehicle                 |
| `seating_frame_rear.svg`   | `unloading-seating-frame-rear`   | 0.5, 0.5       | Behind cask on pad                  |
| `seating_frame_front.svg`  | `unloading-seating-frame-front`  | 0.5, 0.5       | In front of cask on pad             |
| `windsock.svg`             | `unloading-windsock`             | 0.1, 0.5       | Pole at left; tip toward wind       |
| `berth_backdrop.webp`      | `unloading-berth-backdrop`       | 0.5, 0.5       | Full camera plate; no physics       |

Update this table when real SVGs set non-center pivots.

## Depth (Phaser) — draft

| Layer                | Approx depth | Content             |
| -------------------- | ------------ | ------------------- |
| Backdrop             | 0            | Berth plate / sky   |
| Water FX             | 1–2          | Sea surface motion  |
| Quay / cradle rear   | 4–5          | Static berth        |
| Ship hull rear       | 8            | Behind in-hold cask |
| Cask                 | 12–14        | Free or locked load |
| Ship hold foreground | 16           | Hatch lip mask      |
| Trolley / spreader   | 18           | Crane moving parts  |
| Cables               | 20           | Runtime lines       |
| HUD (DOM)            | —            | React overlays      |

Greybox depths in `SimulationScene` should converge to this map in later commits.

## Fallback

If a file 404s or load fails, keep greybox `Rectangle` for that entity. Boot must never hard-fail on missing art.

## Status (Phase 8 C4)

Minimal industrial SVG placeholders land under `public/assets/unloading/svg/` for all
design-directive basenames. They are scalable `viewBox` drawings (no text). Phaser
still uses greybox rectangles until C5 wires texture load + Image display.
