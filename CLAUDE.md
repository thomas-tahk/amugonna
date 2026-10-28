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
- **Hosting**: Digital Ocean

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
- **No AI in the app.** The OpenAI recipe generator was removed; ignore any older text saying otherwise.
- Working: JWT auth, ingredient search, pantry CRUD, recipe CRUD, pantry-based suggestions (exact-ingredient scoring), 21 seed recipes.
- Not built: ingredient normalization, dietary-restriction filtering, meal planning, shopping lists, large recipe catalogue.
- **Milestone 1 ("Cook from my pantry") in progress** - see `docs/milestones/M1.md` for plan and issues.
- Tests: Vitest in both workspaces; CI in `.github/workflows/ci.yml`; schema via Prisma migrations in `server/prisma/migrations/`.

## Development Status
- **Backend**: auth, ingredients, pantry, recipes, suggestions endpoints
- **Frontend**: auth form, pantry manager, recipe list/detail/form
- **Database**: PostgreSQL + Prisma, baseline migration `init`
- **Docs**: hand-maintained (the old auto-sync script is gone; nothing rewrites docs)

## Development Approach Notes
- **Token Efficiency**: Switched to guided development approach to reduce token consumption
- **Code Ownership**: User-led implementation with Claude providing structure and guidance
- **Testing Focus**: Backend API testing before frontend integration
- **Incremental Development**: Small, testable pieces rather than comprehensive generation

## Next Session Pickup Instructions
1. Read `docs/milestones/M1.md` for the current plan.
2. Install: `npm ci --ignore-scripts` (repo root), then `cd server && npx prisma generate`.
3. Migrate: `cd server && npx prisma migrate deploy` (needs `DATABASE_URL` and `DIRECT_URL`).
4. Test: `npm test`. Build: `npm run build`. Lint client: `npm run lint -w client`.
5. Run: `npm run dev`.

## Next Steps
See `/docs/ROADMAP.md` for detailed development priorities and planning.