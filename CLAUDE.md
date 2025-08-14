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
- Basic project structure and boilerplate complete
- **Database foundation fully operational** - PostgreSQL + Prisma working
- All database tables created and tested (users, recipes, ingredients, dietary restrictions)
- **Complete JWT-based authentication system** - Registration, login, profile management tested and working
- **Ingredient management API** - Search, user pantry CRUD operations, database seeding
- Server-database connectivity verified via health endpoint
- Ready for frontend ingredient interface development
- Documentation structure established and maintained

## Next Steps
See `/docs/ROADMAP.md` for development priorities and planning.