# Amugonna — current state audit
_2026-10-25, branch `chief`, commit 2bf089f. Everything below was run or read in this audit; docs were not trusted._
Env: macOS, Node v23.7.0, Homebrew PostgreSQL 15 (throwaway cluster on port 5544, since stopped). Browser UI was **not** driven (no Playwright/browser run) — client is verified only to typecheck and build.

## 1. Install / typecheck / build

| Step | Command (cwd) | Result |
|---|---|---|
| Install | `npm ci` (repo root) | PASS — 418 packages, 25 audit vulns (2 low, 5 mod, 16 high, 2 critical; not triaged) |
| Client typecheck + build | `npm run build` (`client/`) = `tsc -b && vite build` | PASS — 44 modules, 221 kB JS |
| Client lint | `npm run lint` (`client/`) | FAIL — 6 errors, 3 warnings (`no-explicit-any` x4, unused var, react-refresh export rule). Not part of build. |
| Server typecheck, fresh clone | `npx tsc --noEmit` (`server/`) | FAIL — 18 x TS7006 "implicit any" in `routes/ingredients.ts` + `routes/recipes.ts`. Cause: Prisma client not generated yet, so model types are `any`. |
| Server typecheck after generate | `npx prisma generate` then `npx tsc --noEmit` | PASS |
| Server build | `npm run build` (`server/`) = `tsc` | PASS after `prisma generate` |

Takeaways:
- `server` `build` script does not run `prisma generate`. Works on Render only because `render.yaml` buildCommand does `npx prisma generate && npm run build`. A bare `npm run build` from root on a fresh clone fails.
- Root `postinstall` runs `scripts/sync-docs.js`, which **rewrites CLAUDE.md, README.md, SESSION_RESUME.md** with stale "OpenAI recipe generation" text (it modified all three during my `npm ci`; I reverted them). This script and `.github/workflows/sync-docs.yml` are the reason the docs keep re-asserting the removed AI feature. See section 6.
- No test suite exists (no test script, no test files in either workspace).

## 2. Can the server run?
**Yes.** Started a local Postgres 15 cluster, then:
```
export DATABASE_URL=postgresql://postgres@localhost:5544/amugonna_audit DIRECT_URL=<same> JWT_SECRET=audit PORT=3077
cd server
npx prisma migrate deploy   # -> "No pending migrations to apply." (creates NOTHING)
npx prisma db push          # -> creates tables
npx tsx prisma/seed.ts      # -> "21 recipes created"
npm run build && node dist/index.js
```
Observed: `GET /health` -> `{"status":"OK","database":"Connected"}`. Register, login, profile, ingredient search, pantry add/update/delete, recipe create/get/update/favorite/delete, suggestions, and 401 without a token all returned `success:true` over curl (details in section 3).

**Deploy bug found:** `server/prisma/migrations/` does not exist. `render.yaml` start command is `npx prisma migrate deploy && npm start`, which with no migrations is a no-op, so a fresh Neon DB would get no tables (health check would pass the `SELECT 1` but every route would 500). Whoever deployed in April either ran `db push` by hand or the live DB state is unknown. Live deployment was not checked.

Register requires `firstName` and `lastName` (returns 400 "First name is required" otherwise).

## 3. Feature inventory

| Feature | Status | Evidence |
|---|---|---|
| Auth (register/login/profile get+put, JWT, bcrypt) | **works** (curl-tested) | `server/src/routes/auth.ts`, `lib/auth.ts`, `middleware/auth.ts`; client `contexts/AuthContext.tsx`, `components/AuthForm.tsx` |
| Ingredient search | **works** (curl-tested) | `GET /api/ingredients?search=egg` -> Eggs. `server/src/routes/ingredients.ts:8`. Substring, case-insensitive, default limit 20. `total` is the page size, not a true total. UI: `IngredientSearch.tsx` |
| Pantry CRUD | **works** (curl-tested) | `POST/PUT/DELETE /api/ingredients/user`, `GET /user`; `PantryManager.tsx`. Pantry rows can carry quantity/unit/expiry, but matching ignores all three (presence only). |
| Add a *new* ingredient not in DB | **missing** | No create-ingredient endpoint. Users can only pick from the 40 seeded ingredients. |
| Recipe CRUD | **works** (curl-tested) | `server/src/routes/recipes.ts` (create/get/put/delete/favorite); UI `RecipeForm.tsx`, `RecipeDetail.tsx`, `RecipeManager.tsx` ("My recipes" tab). Create form requires picking existing ingredient IDs, so it inherits the 40-ingredient ceiling. |
| Pantry-matching suggestions | **works** (curl-tested), but see 4 | `GET /api/recipes/suggestions`, `recipes.ts:77`; UI `RecipeManager.tsx` "suggestions" tab with canMakeNow / almostThere / aspirational |
| Recipe UI | **exists, not browser-tested** | builds clean; `client/src/components/Recipe*.tsx`, tabs in `App.tsx` (Recipes / My Pantry) |
| Static recipe dataset | **works**, tiny | 21 recipes inline in `server/prisma/seed.ts`, loaded by `npm run seed`, owned by `system@amugonna.internal`, `isPublic: true` |
| Favorites | works API-side; no UI use found in a quick read | `POST /api/recipes/:id/favorite` |
| Dietary restrictions | **stub** | Tables exist (`DietaryRestriction`, `UserDietaryRestriction`, `RecipeDietaryTag`), 6 restrictions seeded, nothing filters on them. Recipe `dietaryTags`/`allergens` are free-text arrays, also unused in matching. |
| Meal planning / shopping list | **missing** | Only in docs |
| Tests | **missing** | none |

Quirks: `GET /api/recipes` (the "My recipes" list) returns only recipes you created, so the 21 bundled recipes are visible **only** through suggestions (and only if they score >= 50%). There is no "browse all recipes" path.

## 4. Bundled dataset and real-pantry match test

Dataset facts (queried from the seeded DB):
- **21 recipes**, all hand-written in `seed.ts` (the git log says "TheMealDB"; no TheMealDB data or fetch code remains). Cuisines: American, Mexican, Indian, French, Italian, Asian, British.
- **40 distinct ingredients** (39 used by recipes; Soy Sauce was auto-created, category "Other"). 184 recipe-ingredient rows; 5 are optional. Required ingredients per recipe: avg 8.5, min 3, max 12.
- Most common: Salt (20 of 21 recipes), Black Pepper (17), Garlic (15), Olive Oil (14), Onion (10), Butter (9).
- **Normalization: effectively none.** Ingredients are a flat table keyed by exact name (`@unique`). Seed's `getOrCreateIngredient` does trim + case-insensitive exact lookup. No synonyms, plural/singular folding ("Tomatoes" and "Canned Tomatoes" are unrelated rows; no "egg"/"eggs", no "scallion"/"green onion"), no category-level substitution. The `substitutions` column exists on `RecipeIngredient` but is never read by matching.

**Test A — the task's sample pantry (8 items):** Eggs, Rice, Onion, Garlic, Chicken Breast, Pasta, Canned Tomatoes, Cheese. Real output of `GET /api/recipes/suggestions`:
```
pantrySize 8
canMakeNow 0
almostThere 0
aspirational 1
   50% Chicken Noodle Soup 4/8   missing: Chicken Broth, Carrots, Salt, Black Pepper
```
One result out of 21, and it is a 50% match. A phone user would see essentially nothing.

**Test B — same plus staples (Butter, Salt, Black Pepper, Olive Oil, Milk, Bread; 14 items):**
```
pantrySize 14
canMakeNow 1
   100% Scrambled Eggs on Toast 5/5
almostThere 9
   86% Tomato Soup 6/7        missing: Chicken Broth
   83% Spinach and Cheese Omelette 5/6   missing: Spinach
   80% Mushroom Risotto 8/10  missing: Mushrooms, Chicken Broth
   75% Chicken Noodle Soup 6/8   missing: Chicken Broth, Carrots
   75% Garlic Butter Chicken 6/8 missing: Lemons, Garlic Powder
   73% Chicken Tikka Masala 8/11 missing: Coconut Milk, Cumin, Paprika
   71% Lemon Garlic Butter Salmon 5/7
   70% Spaghetti Bolognese 7/10  missing: Ground Beef, Carrots, Sugar
   70% Egg Fried Rice 7/10       missing: Carrots, Bell Peppers, Soy Sauce
aspirational 9 (50-67%: Chicken Stir Fry, Pasta Primavera, Banana Pancakes, ...)
```
Honest judgment: with a well-stocked pantry (staples included) it returns a believable ranked list, but only **one** recipe is cookable *right now* out of 21. A pantry with the ordinary perishables/proteins but without salt/pepper/oil gets almost nothing, because those staples are marked required in 17-20 recipes. For a real "what can I cook right now" tool, 21 recipes is far too few; you would want hundreds to low thousands, plus staples handling and synonym normalization.

## 5. How matching scores recipes (plain English)
1. Take the set of ingredient IDs in the user's pantry (quantity, unit, expiry ignored).
2. Candidate recipes = ones the user created + all public ones (the 21 seeded).
3. For each recipe, look only at its **non-optional** ingredients. Score = round(100 x required ingredients you have / total required). A recipe with zero required ingredients scores 100.
4. Matching is exact ingredient-ID equality. No substitutions, no staples assumption, no "close enough".
5. Bucket: >= 90 = canMakeNow, 70-89 = almostThere, 50-69 = aspirational; each bucket sorted by score descending (ties in DB order). Anything < 50 is dropped from the response entirely.
6. Each result also lists the missing required ingredients (name + category), which is what a "get missing items" feature would hang off.
Not modelled: ingredient quantities, recipe popularity, time, dietary restrictions, expiring-soon items, pantry-staple defaults.

## 6. Dead code and leftovers from the removed AI feature
Code is clean: no OpenAI/Anthropic imports, no AI routes, no `isAiGenerated` field in schema. `server/src/services/` is an empty directory (untracked by git). What remains:
- `scripts/sync-docs.js` (+ root `postinstall` + `.github/workflows/sync-docs.yml`): still checks for `aiRecipeGenerator.ts`, `RecipeGenerator.tsx`, `OPENAI_API_KEY`, and **regenerates README/CLAUDE.md/SESSION_RESUME.md claiming AI generation exists**. Main source of doc staleness; also the workflow's commit message adds a Co-Authored-By trailer.
- `README.md`, `CLAUDE.md`, `SESSION_RESUME.md`: describe OpenAI generation, "Backend 100% complete with AI recipe generation".
- `client/src/components/PantryManager.css:266-292`: unused `.recipe-generator-section` styles.
- Prisma schema carries unused fields: `Ingredient.nutritionalInfo`, `Recipe.nutritionalInfo`, `images`, `videoUrl`, `timesCooked`, `lastCooked`, and the whole dietary-restriction trio (vision says no nutrition/macros).
- `docs/RESEARCH.md` mentions TheMealDB/Spoonacular as live options; `docs/ROADMAP.md` boxes for recipe CRUD/UI still unchecked despite being built.
- **Local-only secret, not in git:** `server/.env` (gitignored, never in history — checked with `git log --all -S"sk-proj"`) contains an `OPENAI_API_KEY` and a `SPOONACULAR_API_KEY`. No code uses either. Value not recorded here. Consider revoking the OpenAI key.

## 7. Open risks for planning
- Deploy: no Prisma migrations; Render free tier idle-sleeps; live URLs/state unverified.
- 25 npm audit vulnerabilities untriaged.
- No tests anywhere.
