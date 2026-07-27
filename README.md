# GNFL

Fictional 2D PC web game inspired by a cold coastal nuclear fuel cycle facility.
Initial vertical slice: **unload a spent fuel transport cask from a moored ship onto a
land transporter cradle**, then evaluate the stage and submit a casual online ranking.

Public URL (later phases): `https://gnfl.pitekusu.dev/`

## Phase 0 status

Repository scaffold:

- pnpm + Vite + React + TypeScript (strict)
- Phaser empty scene rendered inside a React screen
- Vitest unit smoke + Playwright Chromium smoke
- AWS CDK empty app stacks (`cdk synth`)
- GitHub Actions `ci.yml`

Game physics, crane controls, ranking API, and production deploy are **out of scope**
for Phase 0.

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
