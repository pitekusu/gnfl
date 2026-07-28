# GNFL

Fictional 2D PC web game inspired by a cold coastal nuclear fuel cycle facility.
Initial vertical slice: **unload a spent fuel transport cask from a moored ship onto a
land transporter cradle**, then evaluate the stage and submit a casual online ranking.

Public URL (later phases): `https://gnfl.pitekusu.dev/`

## Phase status

### Phase 0 — done

Repository scaffold: pnpm + Vite + React + TypeScript (strict), Phaser host,
Vitest/Playwright smoke, empty CDK stacks, GitHub Actions `ci.yml`.

### Phase 1 — done

Simulation worker foundation:

- Protocol types for Main ↔ Worker messages
- Fixed 120 Hz step loop with catch-up limit
- Rapier 2D WASM inside the module worker only
- Greybox floor + falling box demo (archived under `simulation/demo/`)
- 60 Hz `SNAPSHOT` posts + Phaser interpolation
- Tab hide → pause; scene unmount → dispose worker
- React only sees low-frequency ready/error status

### Phase 2 — done (greybox crane)

Unloading berth greybox on branch `feat/phase-2-crane-greybox`:

- Layout + crane physics config (Zod)
- Fixed quay + cradle; kinematic ship with seeded heave/pitch
- Rail trolley, dual spring-damper cables, dynamic spreader
- Free (unlocked) cask in the hold
- Keyboard: A/D trolley, W/S hoist, Shift 緩速, Esc pause
- React HUD: 振れ / 張力 / 緩速状態
- Mouse levers deferred

**Try the feel:** hard-stop after trolley move (swing), Shift for fine positioning,
lock on the cask, lift clear of the hold, seat on the quay cradle.

### Not yet

Weather events (Phase 4), scoring / results (5), ranking API / AWS deploy (6–7),
final art (8).

## Controls (Phase 3)

| Key       | Action                                         |
| --------- | ---------------------------------------------- |
| `A` / `←` | Trolley left                                   |
| `D` / `→` | Trolley right                                  |
| `W` / `↑` | Hoist up (shorten cable)                       |
| `S` / `↓` | Hoist down (lengthen cable)                    |
| `Shift`   | Fine mode（緩速状態）                          |
| `Space`   | Lock when ready; unlock anywhere (re-lockable) |
| `E`       | Emergency stop → safe abort                    |
| `Esc`     | Pause toggle                                   |

**Complete:** free/drop seating on the cradle finishes immediately; locked seating
finishes when you unlock on the pad (`Space`).

## Development

```bash
pnpm install
pnpm dev
```

Useful scripts:

| Script              | Purpose                                                   |
| ------------------- | --------------------------------------------------------- |
| `pnpm dev`          | Local Vite dev server                                     |
| `pnpm build`        | Typecheck + production build                              |
| `pnpm test`         | Unit tests (Vitest)                                       |
| `pnpm test:e2e`     | Playwright smoke (uses `vite preview`)                    |
| `pnpm lint`         | ESLint                                                    |
| `pnpm format:check` | Prettier check                                            |
| `pnpm cdk:synth`    | Synthesize empty CDK stacks                               |
| `pnpm ci`           | Local approximation of CI (no Playwright browser install) |

## Documentation

- `docs/gnfl-implementation-directive.md` — implementation directive (source of truth)
- `docs/gnfl-ChatGPT-Design-Directive.md` — art / CG / UI appearance directive
- `docs/decisions/0001-phase1-worker-snapshot-architecture.md`
- `docs/decisions/0002-phase2-crane-greybox.md`

## Stack (target)

React · Phaser 4 · Rapier 2D (Web Worker) · Vite · Zod · AWS CDK · S3 · CloudFront ·
API Gateway HTTP API · Lambda · DynamoDB · GitHub Actions OIDC
