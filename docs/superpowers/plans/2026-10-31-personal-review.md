# Three iterations to personal-use review

User authorized continuous implementation through final review; do not merge, publish or purchase hosting until that review and last adjustments.

## Done-gate
Enter a real pantry, find a suitable recipe, import a recipe through a URL or pasted text, review/edit it, save privately, favorite it, add a personal note, and cook using its steps on desktop and phone. Exclusions must govern imported recipes. Retain account/pantry across local restarts.

## Iteration 1 — real-use polish
- Add `아무거나` under Amugonna using normal Korean spacing. English UI remains; full translation later.
- Reuse the existing local signing secret across restarts without modifying any .env file or printing it.
- Increase Korean recipe availability through a curated source collection, with specific version/source descriptions. No Korean ranking boost. Do not invent recipes or imply a cuisine label establishes exclusive origin.
- Keep recipe database/API extraction as a distant stretch goal.
- Integration ruling: allow a user to confirm ingredient labels they have checked, clearing only unknown/composite uncertainty. Explicit exclusions still win. Without this, imported Korean recipes containing unfamiliar pastes or kimchi could remain permanently unavailable despite the user knowing their products.

## Iteration 2 — personal recipe collection
- URL or pasted text -> editable preview -> explicit Save privately. Never silently publish imported content.
- URL import reads structured Recipe JSON-LD from supported pages. Unsupported/blocked pages offer paste fallback. Network requests must reject local/private destinations and bound redirects/body/time.
- Pasted text supports common Ingredients/Instructions sections and ingredient lists; user corrects parse before save. No paid AI dependency; AI assistance remains optional later.
- Favorites of public and own-private recipes are findable; personal notes persist per user, including on recipes the user does not own. Library navigation is keyboard accessible.

### Import interface
`POST /api/recipe-imports/preview` takes `{url?: string, text?: string}` and returns `{success:true,data:{draft,warnings:string[]}}`.
`POST /api/recipe-imports` takes `{draft}` and returns `{success:true,data:{recipe:{id:number}}}`.
Draft: `{title:string,description:string,ingredients:string[],instructions:string,sourceUrl:string,sourceName:string,cuisineTypes:string[],prepTime:number|null,cookTime:number|null,servings:number}`. Ingredient lines retain source wording and quantities; instructions are newline-separated steps. Validate again on save; save as the authenticated user's private recipe.

## Iteration 3 — ready for personal deployment
- Prepare Vercel-compatible backend routing/build while preserving Express/Postgres.
- Persistent production sessions, optional personal-access allowlist, database export/restore procedure and smoke checks.
- Determine an actual viable hosting path. Do not silently choose an idle-pausing database contrary to stated preference. No new subscription or production changes before review.

## Verification
- Browser tests first for new journeys; pure parser and API tests for extraction, ownership, invalid URLs/content and exclusion integrity.
- Full existing tests/build/lint plus desktop/phone end-to-end; real source-page import outside mocks when available.
- Independent final code review, then a user review packet with local link, exact things to try, changes, remaining hosting constraints and evidence.
