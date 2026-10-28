# Session Resume

## Where things stand

- No AI in the app. The OpenAI recipe generator was removed; any older doc saying otherwise is wrong.
- Working: auth, ingredient search, pantry CRUD, recipe CRUD, pantry-based suggestions (exact-match scoring), 21 seed recipes.
- In progress: Milestone 1, "Cook from my pantry". Plan and issue list: `docs/milestones/M1.md`.
- Tests: Vitest in both workspaces (`npm test`). CI runs on every push and pull request.
- Schema is managed by Prisma migrations in `server/prisma/migrations/`.

## Commands

```bash
npm ci                                  # install (repo root; also runs prisma generate)
cd server && npx prisma migrate deploy  # create/upgrade tables (needs DATABASE_URL, DIRECT_URL)
npm test                                # server then client tests
npm run build                           # client then server
npm run lint -w client
npm run dev                             # client + server
```

Do not create or edit `.env` files from tooling; the owner manages them.
