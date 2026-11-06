@AGENTS.md

## Claude-specific reminders

- Do not push to git. Do not add `Co-Authored-By`, "Generated with Claude Code", or any Claude/AI signature to commits or PRs. Commits should read as written by the repository owner only.
- The oak generator (`src/engine/generators/oak.ts`) is intentionally left for the owner to implement.
- Prefer small, verified steps: run `npm test`, `npm run typecheck` and `npm run lint` before declaring work done.
