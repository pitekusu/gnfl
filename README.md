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
- Greybox floor + falling box demo
- 60 Hz `SNAPSHOT` posts + Phaser interpolation
- Tab hide → pause; scene unmount → dispose worker
- React only sees low-frequency ready/error status

### Not yet

Crane controls, weather, scoring, ranking API, production deploy (Phases 2+).

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

## Stack (target)

React · Phaser 4 · Rapier 2D (Web Worker) · Vite · Zod · AWS CDK · S3 · CloudFront ·
API Gateway HTTP API · Lambda · DynamoDB · GitHub Actions OIDC
