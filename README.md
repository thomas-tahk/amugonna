# Amugonna

Find recipes you can cook from what is already in your fridge and pantry.

Amugonna is a React + TypeScript client and a Node/Express + Prisma + PostgreSQL server in one npm-workspaces monorepo.

## What works today

- Sign up and sign in.
- **Kitchen** tab: tap common items by category, or type free text like "eggs, scallions" and confirm the chips. Type-ahead is fuzzy.
- **Cook** tab: "Cook now" and "1 ingredient away". The missing item is named, swaps are shown, and you can copy the missing items.
- **Cook view**: ingredients with have / swap / missing / assumed badges, numbered tappable steps, source attribution, screen kept awake.
- **My recipes**: your own manual recipes.

There is **no AI** in the app and no API keys are needed.

## Recipe base

- `npm run seed -w server` loads the ingredient vocabulary (~500) and 21 starter recipes. It is **required**: without it the Kitchen tab has no quick picks.
- The dev seed also adds 30 "Amugonna test fixture" recipes that appear in Cook results. `NODE_ENV=production npm run seed -w server` skips them.
- `npm run import:mealdb -w server` fetches ~790 recipes from TheMealDB's free test key. That key is for development; a public launch needs their supporter key (see the M1 report). Recipes are stored only in your database, never committed.
- `npm run report:matches -w server` prints how many recipes reference pantries can cook.

## What is next

Direction is in [docs/chief/vision.md](docs/chief/vision.md); the M1 plan is [docs/milestones/M1.md](docs/milestones/M1.md). Hosting is undecided (options are in the M1 plan).

## Getting started

Requires Node 22 and a PostgreSQL database.

```bash
# 1. Install (also generates the Prisma client)
npm ci

# 2. Configure the server: create server/.env yourself (never committed) from
#    server/.env.example. Needs DATABASE_URL, DIRECT_URL (same URL locally), JWT_SECRET

# 3. Create the tables and load the recipe base (from server/)
cd server && npx prisma migrate deploy && npm run seed && cd ..

# 4. Run client (Vite) and server (tsx watch) together (from the repo root),
#    then open the client URL vite prints
npm run dev
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Client and server in watch mode |
| `npm test` | Server tests, then client tests (Vitest). Server DB tests run only when `TEST_DATABASE_URL` is set; otherwise they are skipped. See below |
| `npm run e2e` | Builds both apps, then runs Playwright at phone and desktop sizes. Needs a migrated and seeded database (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` in the environment), `npx playwright install chromium` once, and ports 3201 and 4201 free |
| `npm run build` | Builds client, then server (`prisma generate && tsc`) |
| `npm run lint -w client` | ESLint on the client |
| `npm run seed -w server` | Vocabulary and starter recipes |
| `npm run import:mealdb -w server` | Optional: TheMealDB recipes |
| `npm run report:matches -w server` | Match numbers for reference pantries |

### Running the DB tests

The DB-backed server tests never use `DATABASE_URL` (which `server/.env` may point at a real database). They run only against `TEST_DATABASE_URL`, and the config refuses to start if that database name does not contain `test`:

```bash
createdb amugonna_test
cd server
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/amugonna_test \
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/amugonna_test \
  npx prisma migrate deploy && npm run seed        # the seed is optional; tests seed what they need
cd .. && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/amugonna_test npm test
```

With `TEST_DATABASE_URL` unset, `npm test` still runs the pure unit tests and skips the DB suites with a warning.

CI (`.github/workflows/ci.yml`) runs `npm ci`, `prisma migrate deploy`, test, build and lint against a Postgres 16 service, with `TEST_DATABASE_URL` pointing at its `amugonna_test` database. The server refuses to start when `JWT_SECRET` is unset.

After that, the `e2e` job runs the Playwright done-gate tests at phone and desktop sizes.

Existing database created with `db push` (e.g. the live Render/Neon DB)? Follow the ordered steps in [server/setup-database.md](server/setup-database.md) before merging to main.

## Project layout

- `client/` React + Vite app
- `server/` Express API, Prisma schema and migrations (`server/prisma/`)
- `docs/` plans and research

## License

MIT
