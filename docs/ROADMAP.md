# Development Roadmap

## Strategic Direction Change (December 2025)

**Key Decisions:**
- ❌ **Removed AI recipe generation** - Quality issues and unpredictable costs
- ✅ **User-controlled recipe collection** - CRUD operations for personal recipe management
- ✅ **Meal planning as core feature** - Calendar-based planning with historical data
- ✅ **No external recipe APIs** - Users import/create their own recipes
- ✅ **Smart matching without AI** - Algorithmic ranking based on pantry ingredients

## Phase 1: Remove AI & Build Recipe Foundation
1. [x] Delete all AI/OpenAI code and related endpoints
2. [x] Design Recipe database schema
3. [ ] Build Recipe CRUD API endpoints
4. [ ] Build Recipe CRUD UI (create, view, edit, delete)

## Phase 2: Meal Planning (CORE)
5. [ ] Design MealPlan database schema
6. [ ] Build meal planning API (CRUD for meal plans)
7. [ ] Build calendar UI (week/month view)
8. [ ] Drag-and-drop recipes onto calendar
9. [ ] Historical view (browse past meal plans)
10. [ ] Quick actions (copy week, clear week, notes)

## Phase 3: Smart Matching & Shopping
11. [ ] Recipe ranking algorithm (pantry ingredient match)
12. [ ] Tiered results (can make now / almost / aspirational)
13. [ ] Dietary restriction filtering
14. [ ] Auto-generate shopping list from meal plan
15. [ ] Shopping list UI

## Phase 4: Recipe Import & Enhancement
16. [ ] Import from URL (web scraping)
17. [ ] Import from copy-paste text
18. [ ] Batch import features
19. [ ] Recipe sharing (optional)

## Phase 5: Polish & Optional
20. [ ] Pantry usage tracking (mark ingredients as used after cooking)
21. [ ] Recipe suggestions based on history ("you liked this 2 weeks ago")
22. [ ] Meal plan templates (repeat favorite weeks)
23. [ ] Export features (PDF meal plan, etc.)

---

## Completed Foundation Work ✅

### Infrastructure
- [x] Project initialization and monorepo setup
- [x] Basic React frontend with TypeScript
- [x] Basic Express backend with TypeScript
- [x] Documentation structure
- [x] Database setup (PostgreSQL)
- [x] Prisma client generation and schema migration
- [x] Server-database connectivity verification

### Authentication & User Management
- [x] JWT-based authentication system
- [x] User registration and login
- [x] Profile management
- [x] Authentication context (frontend)

### Ingredient Management
- [x] Ingredient database schema
- [x] Ingredient search API
- [x] User pantry CRUD operations
- [x] Database seeding
- [x] Pantry management UI (frontend)

---

## Technical Specifications

### Recipe CRUD Schema
```typescript
Recipe {
  id: string
  user_id: string
  name: string
  description: string
  source_url?: string
  source_name?: string

  ingredients: Ingredient[]
  instructions: Instruction[]

  tags: string[]
  cuisine_types: string[]
  dietary_tags: string[]
  allergens: string[]

  prep_time?: number
  cook_time?: number
  servings: number
  difficulty?: string

  images: string[]
  video_url?: string

  personal_notes?: string
  modifications?: string
  rating?: number
  times_cooked: number
  last_cooked?: date
  is_favorite: boolean
  is_public: boolean

  created_at: date
  updated_at: date
}
```

### Meal Planning Schema
```typescript
MealPlan {
  id: string
  user_id: string
  date: date
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'

  recipe_id?: string
  servings?: number
  notes?: string

  created_at: date
  updated_at: date
}
```

### Smart Matching Algorithm
```
Tiered Ranking System:

Tier 1: Perfect Matches (Score: 90-100)
├─ User has all ingredients
├─ Meets all dietary restrictions
└─ No allergens present

Tier 2: Easy Adaptations (Score: 70-89)
├─ Missing 1-2 minor ingredients
├─ OR simple substitution available
└─ Clearly labeled with suggested modifications

Tier 3: Aspirational (Score: 50-69)
├─ Missing 3-4 ingredients
└─ Good for shopping list planning

Tier 4: Out of Scope (Score: <50)
└─ Don't show or bury at bottom
```

---

## Storage Considerations

**Meal Planning Historical Data:**
- Single entry: ~200 bytes
- One year: ~219 KB per user
- Ten years: ~2.2 MB per user
- **Verdict:** Store all history indefinitely (negligible cost)

---

## Out of Scope (For Now)

- ❌ Calorie tracking
- ❌ Macro counting
- ❌ Nutrition analysis
- ❌ AI-generated recipes

*These may be reconsidered based on user feedback after core features are stable.*

---

**Last Updated:** December 29, 2025
