# Research & Technical Decisions

## Recipe Data Sources

### Free APIs (Initial Choice)
- **Spoonacular API**: Comprehensive recipe database with dietary filters
  - Free tier: 150 requests/day
  - Ingredients, instructions, nutrition, dietary tags
  - Good allergy/intolerance support
- **Edamam Recipe API**: Large recipe database
  - Free tier: 5 requests/minute
  - Strong dietary restriction filtering
- **TheMealDB**: Free recipe database
  - No rate limits on free tier
  - Limited dietary filtering capabilities

### Decision: Start with Spoonacular
- Best balance of features and free tier limits
- Excellent dietary restriction support
- Comprehensive ingredient data
- Good documentation and TypeScript support

## Recipe Matching Algorithm

### Core Scoring Factors
1. **Ingredient Match Percentage** (40% weight)
   - Exact matches: 100% score
   - Partial matches: 70% score
   - Substitutions: 50% score
   - Missing ingredients: 0% score

2. **Dietary Safety** (35% weight)
   - Allergen compatibility: Pass/fail (blocking)
   - Dietary restrictions: Pass/fail (blocking)
   - Intolerance accommodation: High priority

3. **Convenience Factors** (25% weight)
   - Number of missing ingredients
   - Ingredient substitution difficulty
   - Preparation complexity

### Algorithm Approach
- **Phase 1**: Simple boolean matching (have ingredients = show recipe)
- **Phase 2**: Percentage-based scoring with dietary filters
- **Phase 3**: Sophisticated scoring with substitutions and preferences

## Database Schema Considerations

### Core Tables
- `users` - User accounts and preferences
- `recipes` - Recipe data (API cached + user-generated)
- `ingredients` - Ingredient master list
- `user_ingredients` - User's available ingredients
- `dietary_restrictions` - User's dietary needs
- `allergies` - User's allergies and intolerances

### Dietary Restriction Approach
- Store as structured data (not just tags)
- Support multiple restriction types per user
- Include severity levels for intolerances
- Enable quick filtering and safety checks

## Technical Stack Decisions

### Frontend
- **React 19** with TypeScript for type safety
- **Vite** for fast development and building
- **Component library**: TBD (consider Chakra UI or Material-UI)

### Backend
- **Express** with TypeScript for API consistency
- **PostgreSQL** for relational data and complex queries
- **ORM**: Consider Prisma or TypeORM for type safety

### Deployment
- **Digital Ocean** as planned
- **Docker** for containerization
- **Environment separation** for dev/staging/prod