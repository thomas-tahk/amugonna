# Amugonna

Find recipes you can cook from what is already in your fridge and pantry.

Amugonna is a React + TypeScript client and a Node/Express + Prisma + PostgreSQL server in one npm-workspaces monorepo.

## What works today

- Sign up, sign in, profile (JWT auth).
- Ingredient search and a personal pantry (add, update, remove).
- Recipes: create, view, edit, delete, favorite; a small bundled seed set (21 recipes).
- Pantry-based recipe suggestions (exact-ingredient matching).

There is **no AI in the app**. The earlier OpenAI recipe-generation feature was removed.

## What is in progress

Milestone 1, "Cook from my pantry" (see [docs/milestones/M1.md](docs/milestones/M1.md)): foundation (tests, CI, migrations), an ingredient normalizer, a new design system, a larger recipe catalogue, and a better matching engine.

## Getting started

Requires Node 22 and a PostgreSQL database.

```bash
# 1. Install (also generates the Prisma client)
npm ci

# 2. Configure the server: create server/.env yourself (never committed) with
#    DATABASE_URL, DIRECT_URL (same URL locally), JWT_SECRET

# 3. Create the tables (from server/)
npx prisma migrate deploy

# 4. Optional: load the seed recipes (from server/)
npm run seed

# 5. Run client (Vite) and server (tsx watch) together (from the repo root)
npm run dev
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Client and server in watch mode |
| `npm test` | Server tests, then client tests (Vitest). Server DB tests run only when `TEST_DATABASE_URL` is set; otherwise they are skipped. See below |
| `npm run build` | Builds client, then server (`prisma generate && tsc`) |
| `npm run lint -w client` | ESLint on the client |

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

Existing database created with `db push` (e.g. the live Render/Neon DB)? See [server/setup-database.md](server/setup-database.md) before deploying.

## Project layout

- `client/` React + Vite app
- `server/` Express API, Prisma schema and migrations (`server/prisma/`)
- `docs/` plans and research

## License

MIT
