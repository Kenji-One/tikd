# Tikd Project Docs

This folder is the shared handoff space for Codex work on Tikd.

- `PROJECT_STATUS.md` is the current implementation snapshot: what is working, what is partial, known backend gaps, env vars, and verification state.
- `CODEX_TASKS.md` is the task board for future Codex sessions. Keep task IDs stable and update status as work lands.

Update these docs whenever a feature changes from mock/stub to real backend behavior, when deploy requirements change, or when a new blocker appears.

Current baseline:

- `npm run lint` passes with ESLint CLI.
- `npm run build` passes with Next.js 15.5.15.
- Production audit still has NextAuth/Nodemailer/uuid follow-up risk documented in `PROJECT_STATUS.md` and `CODEX_TASKS.md`.
