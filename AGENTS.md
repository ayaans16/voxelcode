# voxelcode: guide for coding agents

A local-first web app for practicing coding problems where every problem grows a procedural voxel tree.
Next.js (App Router) + TypeScript (strict) + Tailwind v4, Vitest, Playwright, Monaco, Pyodide, Three.js.

## Commands

```bash
npm install            # also copies Monaco + Pyodide into /public and bundles the workers
npm run dev            # next dev + esbuild watch for the workers (http://localhost:3000)
npm test               # Vitest (engine, runner, storage, every problem's reference solution in JS and Python)
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run e2e            # Playwright (builds and serves the production app)
npm run build          # production build
```

## Layout and the rules that matter

| Path | What | Rule |
| --- | --- | --- |
| `src/engine` | growth engine: PRNG, species, tree generation, progress math, session logic, stats | **Pure.** No DOM, no three.js, no React, no storage. Deterministic. |
| `src/render` | three.js (InstancedMesh) scenes, animation, day/night, seasons | Only place that imports `three`. `react/` has the thin React wrappers. |
| `src/runner` | harness, comparison modes, worker protocol, Pyodide bridge, `RunnerClient` | `harness.ts`/`compare.ts`/`protocol.ts` are pure and run in Node for tests. |
| `src/problems` | problem schema (zod) and `data/*.ts` problem files | Problems are data. Adding one = one file + one import in `index.ts`. |
| `src/storage` | `Storage` interface, IndexedDB + in-memory implementations, migrations | UI talks to `Storage` only. Bump `CURRENT_SCHEMA_VERSION` and add a migration when a persisted shape changes. |
| `src/components`, `app/` | UI | Thin; logic belongs in the layers above. |

- Workers are **not** bundled by Next. `scripts/build-workers.mjs` (esbuild) emits ES-module workers to `public/workers/`
  because Pyodide refuses to run inside the classic workers the app bundler emits. If you edit `src/runner/*.worker.ts`
  or anything they import, `npm run dev` rebuilds them; otherwise run `npm run build:workers`.
- `public/monaco`, `public/pyodide`, `public/workers` are generated and git-ignored.
- Java, C and Go run on a **local compile server** (`app/api/run`, `src/runner/native/*`): generated driver per signature, token encoding, server-side watchdog. It executes native processes, so `guard.ts` must keep refusing non-loopback hosts, cross-origin and non-JSON requests; never loosen it. Tests for it need the JDK/clang/Go and skip themselves when absent.
- The browser sandbox: JS/Python run in a Web Worker with a hard timeout (the **main thread** terminates the worker; a worker
  cannot interrupt its own infinite loop), no DOM, and network APIs removed before user code runs (`src/runner/lockdown.ts`) plus a
  production CSP (`connect-src 'self'`) in `next.config.mjs`. It protects the user's machine; it is not anti-cheat.
- Growth is monotonic: every progress source ratchets (`max`). Failures never shrink a tree. Hints only reduce the
  golden-leaf bonus. Keep it that way.
- All growth constants live in `src/engine/constants.ts`.

## Problem content

All statements, examples, hints and editorials must be **original writing**. Never copy or closely paraphrase LeetCode,
NeetCode or any other site. Use `src/problems/data/_template.ts` as the starting point. Each problem needs hidden tests in
the categories `basic`, `edge` and `large`, plus JS and Python reference solutions; the test suite verifies them.

## The oak is the owner's TODO

`src/engine/generators/oak.ts` contains a placeholder oak and `OAK_IMPLEMENTED = false`. The owner is implementing the
branch-splitting / voxel-ordering algorithm themselves to learn. Do not "finish" it for them unless they ask.
The acceptance tests are in `oak.test.ts`.

## Git

- **Never push.** Only commit when asked.
- Commits are authored by the user alone: **no `Co-Authored-By` lines, no "Generated with" footers, no AI attribution
  of any kind** in commit messages, PR text or code comments.

## Conventions

- Strict TypeScript (`noUncheckedIndexedAccess` is on). No `any`.
- UI: dark warm-charcoal palette with one orange accent (CSS variables in `app/globals.css`), mono + pixel fonts
  (JetBrains Mono, Silkscreen; bundled via `@fontsource`). **No emoji and no third-party art**: icons are procedural pixel
  SVGs in `src/components/PixelIcon.tsx`.
- Accessibility: keyboard reachable, visible focus, and pass/fail is never conveyed by red/green alone (icon + label too).
