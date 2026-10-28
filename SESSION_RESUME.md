# Session Resume

## Where things stand

- Milestone 1, "Cook from my pantry", is built. Plan: `docs/milestones/M1.md`. Direction: `docs/chief/vision.md`.
- No AI and no API keys. The OpenAI recipe generator was removed; any older doc saying otherwise is wrong.
- Works: sign up/in; Kitchen tab (tap common items or type free text, confirm chips); Cook tab ("Cook now", "1 ingredient away", missing items named, swaps, copy missing items); cook view (have/swap/missing/assumed badges, numbered steps, source, screen stays awake); My recipes.
- The seed is required: `npm run seed -w server` loads the ~500-item vocabulary and 21 starter recipes. Without it Kitchen has no quick picks. The dev seed also adds 30 "Amugonna test fixture" recipes; `NODE_ENV=production` skips them.
- Real recipe base: `npm run import:mealdb -w server` (~790 recipes, TheMealDB free test key, development use; a public launch needs their supporter key). Stored in your DB only, never committed.
- Hosting is undecided (options in `docs/milestones/M1.md`); never an idle-pausing free tier.
- Next: see `docs/chief/vision.md` and `docs/milestones/M1.md`.

## Setup from a clean clone

Needs Node 22 and Postgres. The owner creates `server/.env` from `server/.env.example` (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`); tooling never edits `.env`.

```bash
npm ci
cd server && npx prisma migrate deploy && npm run seed && cd ..
npm run dev          # open the client URL vite prints
```

## Commands

```bash
npm test                          # server then client unit tests
npm run e2e                       # Playwright, phone + desktop
npm run build                     # client then server
npm run lint -w client
npm run import:mealdb -w server   # optional real recipes
npm run report:matches -w server  # match numbers for reference pantries
```

- Unit DB tests need `TEST_DATABASE_URL` pointing at a database whose name contains "test".
- E2E needs a migrated and seeded database (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` in the environment), `npx playwright install chromium` once, and ports 3201 and 4201 free.
