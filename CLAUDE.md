# Claude Context & Instructions

## Project Overview
**Amugonna** is a recipe recommendation app that helps users find recipes based on their fridge and pantry contents, with strong focus on dietary restrictions, intolerances, and allergies.

## Primary Goals
1. **Fast, convenient recipe discovery** based on available ingredients
2. **Dietary accommodation** for restrictions, intolerances, and allergies
3. **User-friendly ingredient input** with search suggestions
4. **Intelligent recipe matching** using sophisticated scoring

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript  
- **Database**: PostgreSQL
- **Hosting**: Undecided (see `docs/milestones/M1.md` for options); never an idle-pausing free tier

## Development Environment
- Monorepo structure with `/client` and `/server` workspaces
- Use `npm run dev` to start both frontend and backend
- Use `npm run build` for production builds

## Testing & Verification Preferences
- All server instances, testing, and visual confirmation go through human verification
- Provide clear instructions on commands to run and expected results
- Human verifies all outcomes before proceeding to next steps
- No automated testing or server startup without explicit instruction

## Security & Configuration Preferences
- **NEVER modify .env files directly** - these contain sensitive information
- Provide guidance on required environment variables with descriptions and examples
- Human handles all .env file creation and modification
- Use .env.example for safe template sharing
- All sensitive configuration goes through human review

## Code Standards
- Follow existing TypeScript patterns in the codebase
- Use existing libraries and utilities where available
- Maintain consistent code style across client and server

## Key Features
- Manual ingredient input with search suggestions
- Recipe matching based on available ingredients
- Dietary restrictions and preferences support (priority focus)
- Offline functionality for saved recipes
- Auto-generated shopping lists
- User accounts and personalized experience

## Current Status
- **Milestone 1 ("Cook from my pantry") is built.** Plan: `docs/milestones/M1.md`.
- **No AI and no API keys needed.** The OpenAI recipe generator was removed; ignore any older text saying otherwise.
- Works today: sign up/in; Kitchen tab (tap common items by category, or type free text like "eggs, scallions" and confirm chips; fuzzy type-ahead); Cook tab ("Cook now" and "1 ingredient away", missing item named, swaps shown, copy missing items); cook view (ingredients with have/swap/missing/assumed badges, numbered tappable steps, source attribution, screen kept awake); My recipes (manual recipes).
- Recipe base: ingredient vocabulary (~500) + 21 starter recipes from `npm run seed -w server`. The seed is required; without it Kitchen has no quick picks. The dev seed also adds 30 "Amugonna test fixture" recipes that show in Cook results; `NODE_ENV=production npm run seed -w server` skips them. `npm run import:mealdb -w server` adds ~790 TheMealDB recipes (free test key, development use only; a public launch needs their supporter key). `npm run report:matches -w server` prints match numbers.
- Not built: dietary/allergy filtering (M2), photo to pantry (M3), bring-your-own recipes (M4), deploy.
- Tests: Vitest in both workspaces, Playwright e2e; CI in `.github/workflows/ci.yml`; schema via Prisma migrations in `server/prisma/migrations/`.

## Development Status
- **Backend**: auth, ingredients, pantry, recipes, normalizer, matching, suggestions endpoints
- **Frontend**: auth, Kitchen, Cook, cook view, My recipes
- **Database**: PostgreSQL + Prisma, migrations `init` and `recipe_base`
- **Docs**: hand-maintained (nothing rewrites docs)

## Development Approach Notes
- **Token Efficiency**: Switched to guided development approach to reduce token consumption
- **Code Ownership**: User-led implementation with Claude providing structure and guidance
- **Testing Focus**: Backend API testing before frontend integration
- **Incremental Development**: Small, testable pieces rather than comprehensive generation

## Next Session Pickup Instructions
1. Read `docs/chief/vision.md` and `docs/milestones/M1.md`.
2. Install: `npm ci` (repo root; the server postinstall runs `prisma generate`).
3. Migrate and seed: `cd server && npx prisma migrate deploy && npm run seed` (needs `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`; the owner creates `server/.env` from `server/.env.example`).
4. Test: `npm test` (DB tests need `TEST_DATABASE_URL` pointing at a database whose name contains "test"). E2E: `npm run e2e`. Build: `npm run build`. Lint client: `npm run lint -w client`.
5. Run: `npm run dev`.

## Next Steps
See `docs/chief/vision.md` and `docs/milestones/M1.md`. (`docs/ROADMAP.md` is superseded.)
