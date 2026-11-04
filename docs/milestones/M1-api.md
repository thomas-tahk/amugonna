# M1 API contract (Kitchen + Cook)

Shared by the server issues (#6 matching, #7 pantry entry) and the client issues (#8 Kitchen, #9 Cook) so they can be built in parallel. All responses use the existing envelope `{ success: boolean, message?: string, data?: T }`. All routes below need `Authorization: Bearer <token>` except `common` and `suggest`.

## Pantry entry (#7)

`GET /api/ingredients/common`
```ts
data: {
  groups: { category: string; items: { id: number; name: string; canonical: string }[] }[]; // vocabulary order
  staples: { id: number; name: string; canonical: string }[];  // assumed present: water, salt, black pepper, cooking oil
}
```

`GET /api/ingredients/suggest?q=tomatoe&limit=8`
```ts
data: { items: { id: number; name: string; canonical: string; category: string | null }[] }
```

`GET /api/ingredients/user` — existing route and shape (`data.ingredients: UserIngredient[]`, each with `ingredient: { id, name, category, canonical }`).

`POST /api/ingredients/user/bulk`
```ts
body: { add?: (number | string)[]; remove?: number[] }   // numbers = ingredient ids; strings = free text, resolved by the normalizer
data: {
  ingredients: UserIngredient[];                          // the whole pantry after the change
  resolved: { input: string; ingredient: { id: number; name: string; canonical: string }; created: boolean }[];
}
```
Adding something already in the pantry is a no-op, not an error. Removing something absent is a no-op. Unknown free text creates a new ingredient (`created: true`).

`POST /api/ingredients/user/parse`
```ts
body: { text: string }   // "eggs, 2 scallions, tomatoe" — split on commas, newlines, " and "
data: { items: { input: string; name: string; canonical: string; known: boolean; ingredientId: number | null }[] }
```
Does not save anything.

## Matching (#6)

`GET /api/recipes/suggestions`
```ts
data: {
  pantrySize: number;
  totalRecipes: number;
  cookNow: RecipeMatch[];   // 0 missing
  oneAway: RecipeMatch[];   // exactly 1 missing
  twoAway: RecipeMatch[];   // exactly 2 missing
}
type RecipeMatch = {
  id: number; title: string; imageUrl: string | null;
  category: string | null; area: string | null;          // e.g. "Chicken", "Italian"
  totalTime: number | null;                              // minutes, prep + cook, if known
  ingredientCount: number;                               // required, non-staple
  usedCount: number;                                     // pantry items the recipe uses
  missing: { name: string; canonical: string }[];
  swaps: { need: string; using: string }[];              // display names
}
```

`GET /api/recipes/:id` — any public recipe or the user's own.
```ts
data: {
  recipe: {
    id: number; title: string; description: string | null; imageUrl: string | null;
    category: string | null; area: string | null;
    servings: number | null; prepTime: number | null; cookTime: number | null;
    steps: string[];                                     // instructions split into steps
    sourceName: string | null; sourceUrl: string | null; attribution: string | null; license: string | null;
    ingredients: { name: string; canonical: string; measure: string | null; optional: boolean;
                   status: 'have' | 'swap' | 'missing' | 'staple'; using?: string }[];
    isFavorite: boolean; isOwner: boolean;
  }
}
```
Existing fields used by the "My recipes" screen stay on the response as well; don't remove them.
