# Recipe data source + ingredient normalization — research
_2026-10-26. Branch `chief`. Unattended cloud run._

## Read this first: evidence quality
- **Primary pages were NOT reachable.** The sandbox proxy returned 403 for themealdb.com, spoonacular.com, developer.edamam.com (direct fetch), huggingface.co, recipenlg.cs.put.poznan.pl, kaggle.com, fdc.nal.usda.gov, en.wikibooks.org, github.com, api.github.com. Only pypi.org and registry.npmjs.org answered.
- So most facts below come from **web-search result summaries and third-party mirrors** (named per claim). Anything not from an official page is marked **UNVERIFIED**. Re-check the license/terms page of the chosen source before launch; that is a ~10 minute task for the owner on a normal connection.
- **No dataset was downloaded; no measurement was made.** The v1 sizing in section 4 is an estimate, not a result.

## 1. Candidates

| Source | Recipes | Ingredients structure | License / redistribution | Cost / limits | Images | Home-cooking quality |
|---|---|---|---|---|---|---|
| **TheMealDB** | ~600-670 (search summaries disagree: 598 on a homepage mirror, 669 on a directory) — UNVERIFIED | `strIngredient1..20` + `strMeasure1..20`: ingredient *name* is a clean field, measure is free text ("1 tbsp"). Names come from a controlled list (~900 ingredients per a directory) — UNVERIFIED | ToS (via tostracker.app summary, UNVERIFIED): free use to look up data/artwork for development projects; **publishing to an app store requires paid supporter**. No stated right to bundle/redistribute the DB. | Free API ("always free at point of access" per mirrors). Supporter upgrade reported as ~$10 one-off, unlocking multi-ingredient filter etc. (mirror, UNVERIFIED). A RapidAPI reseller shows $0 / 100 req/day — reseller terms, not official. | Hosted on their CDN; rights = same ToS, no redistribution grant stated | Good quality, world cuisines, but small and skewed to "dinner party" dishes |
| **Spoonacular** | "360k+" is commonly claimed — UNVERIFIED (not seen on a source I could open) | Parsed: name, amount, unit, aisle, plus ingredient search "by ingredients" endpoint | Commercial API; caching/storage limits and attribution — UNVERIFIED (search found nothing authoritative; one aggregator says "link the source") | Free tier 50 points/day, HTTP 402 when exhausted, resets midnight UTC (several aggregators). Paid $29 / $79 / $149 per month (apis.io aggregator, UNVERIFIED). Card-required-for-free is contradicted between sources. | Hosted images via API; reuse rights UNVERIFIED | Broad, many blog-style recipes |
| **Edamam Recipe Search v2** | "2M+" per aggregators — UNVERIFIED | Parsed with quantities, food IDs | Retired v1 page: attribution required on all tiers, **no recipe caching on free plan**; Nutrition API terms prohibit programmatic collection to save data (search snippets of developer.edamam.com pages). Current v2 terms UNVERIFIED. | Old table: 1,000-call trial then $99/$249/$999 per month. Current free quota UNVERIFIED. | Hosted by Edamam; rules UNVERIFIED | Aggregator of external blogs; recipes link out to the source site |
| **RecipeNLG** | 2,231,142 (catalog + paper); ~1.6M if filtered to `source=Gathered` | Free-text `ingredients` list + `NER` column = cleaned ingredient names without quantities (the NER field is documented on the dataset card; not re-opened this run) | HF dataset card (search snippet): **non-commercial research and educational use only**, permission-request agreement from Poznan Univ. of Technology. TFDS catalog says "no known license". Underlying text is scraped from third-party sites. **Not safe to bundle in a public app.** | Free download | None (text only) | Huge, noisy, many duplicates; real home recipes |
| **Food.com / Kaggle (Majumder et al. 2019)** | ~180k recipes in the commonly cited Kaggle set; sources I saw say 270k recipes / 1.4M interactions (paper) and 522k in a different Kaggle upload — counts UNVERIFIED | Free-text ingredient strings + an `ingredient_ids` mapping (PP_recipes) — from memory, UNVERIFIED | Kaggle page license NOT found. Underlying content is Food.com user submissions. Treat as **research-only / not redistributable** | Free | None | Very good for everyday cooking — real user recipes |
| **Open Recipes (openrecipes/openrecipes)** | ~100k claimed by memory — UNVERIFIED | schema.org `recipeIngredient` free text | Search found nothing about it; I recall it was scraped data with takedown friction. UNVERIFIED — **assume not usable** | — | — | — |
| **Wikibooks Cookbook** | `Category:Recipes` shows 3,819 pages (includes non-recipe pages, so true count lower); 830 pages "with images" | Free-text, human-written wikitext, inconsistent; needs parsing | Wikibooks text is CC BY-SA (my knowledge; the search did not confirm — UNVERIFIED). If true, redistribution OK with attribution + share-alike. | Dumps free | Commons images, per-image licenses | Hit-or-miss; many ethnic/traditional dishes, thin on weeknight meals |
| **schema.org scraped (own crawl)** | whatever you crawl | `recipeIngredient` free text | Facts (ingredient lists) vs. expressive text (method, photos) is a legal gray area; site ToS often forbid scraping. Libraries: `recipe-scrapers` (MIT, PyPI) and `scrape-schema-recipe` (Apache-2.0). | Free | Never copy | Excellent quality but legal exposure |
| **USDA FoodData Central** (not recipes) | ~7.8k SR Legacy foods; Foundation Foods small | Food names only | **CC0 / public domain** (search summary of FDC About/licensing pages), credit requested. SR Legacy final release April 2018; Foundation Foods updated twice a year | Free download (CSV/JSON) | — | Useful as an ingredient *vocabulary*, not recipes |

Also seen but not evaluated: Kaggle "Recipe Ingredients" sets, Epicurious/AllRecipes scrapes (copyright of the sites; assume no), the UCI "Recipe Reviews" set (reviews only).

## 2. Ingredient normalization for fuzzy matching

Problem cases: `eggs`/`egg`, `scallion`/`green onion`, `canned diced tomatoes` -> `tomato`, `boneless skinless chicken breast` -> `chicken`.

Layered approach, cheapest first:
1. **Parse each recipe ingredient line once, offline, at build/import time** (not at request time).
   - `ingredient-parser-nlp` (PyPI; license field reads **MIT** on PyPI metadata v2.9.1; PyPI page claims 95.86% sentence-level / 98.41% word-level accuracy on its own test split — vendor-reported, not reproduced). Returns name, amount, unit, preparation, comment. Python, run in an import script, output committed as JSON/SQL.
   - `ingredient-slicer` (PyPI, MIT) is a lighter rule-based option; not evaluated.
   - Sources that already give a clean name (TheMealDB `strIngredientN`, RecipeNLG `NER`) can skip the parser.
2. **Canonicalize** the parsed name: lowercase, strip, singularize (e.g. `inflect` or a hand rule set — not evaluated), drop prep/descriptor words (diced, chopped, canned, fresh, boneless, skinless, large, organic) into a stoplist, keep the head noun.
3. **Synonym + hierarchy table** (hand-curated, ~300-500 rows): `scallion`->`green onion`; `aubergine`->`eggplant`; `coriander leaves`->`cilantro`; parent links `chicken breast`/`chicken thigh` -> `chicken`; `canned tomatoes`/`diced tomatoes`/`passata`/`tomato` -> `tomato`. Matching rule: a pantry item satisfies a recipe ingredient if it equals it or is its descendant/ancestor (user has "chicken", recipe wants "chicken breast" -> accept, flag as "swap ok").
4. **Vocabulary seed:** USDA FoodData Central food descriptions (CC0) give a free, legally clean list of names and categories to bootstrap the vocabulary and to power pantry-entry autocomplete. Its names are formal ("Tomatoes, red, ripe, canned, packed in tomato juice"), so they need the same head-noun reduction. Usefulness as a *synonym* source is limited — UNVERIFIED, would need a trial.
5. **Staples assumed**: salt, pepper, oil, water, sugar, flour(?) , butter(?) — configurable list the user can edit; ignored when computing "missing".
6. **Unmatched strings** go to a review list instead of failing silently. Pantry free text: fuzzy match to the vocabulary (trigram or Levenshtein; `pg_trgm` is a stock Postgres extension, already available on the project's DB) and show a confirm chip.

## 3. Recommendation

**v1: hybrid — TheMealDB for legally clear starter content is too small by itself; the realistic v1 is a licensed-clean base plus growth path.**

Honest ranking for a public app with possible future revenue:
1. **Do not ship RecipeNLG, Food.com/Kaggle, or scraped sites** as bundled data in a public product: non-commercial/unclear terms (RecipeNLG explicitly non-commercial). Fine for *internal experiments* (e.g. measuring match rates, tuning the normalizer) while the product is personal-only; do not redistribute.
2. **Recommended v1 corpus: TheMealDB (~600) + Wikibooks Cookbook (CC BY-SA, up to a few thousand, after parsing and quality filtering) + the owner's own recipes**, stored in the project's Postgres with attribution fields per recipe. Both are small enough to hand-review the ingredient mapping once. Caveats: TheMealDB's ToS (app-store clause, no stated bundling right) must be re-read; budget the ~$10 supporter fee if an app store is ever targeted. If the TheMealDB terms turn out to forbid copying into your own DB, fall back to live API calls with the free key and a small cache.
3. **Plan B for scale: Spoonacular paid tier** (ingredient-match endpoint, parsed data) once there are users and some revenue, or after reading its terms on caching. Edamam is less attractive (no-caching on free, attribution, link-out).
4. **Later option for volume:** commission/licence a dataset, or let users import recipes by URL via schema.org JSON-LD (user-supplied, stored per-user, not redistributed).

### Sizing: does 8 items + staples reach 10+ cookable-now? (ESTIMATE, not measured)
Pantry: eggs, rice, onion, garlic, chicken, pasta, canned tomatoes, cheese + salt, pepper, oil.
- Cookable-now needs *every* required ingredient present. Typical recipes have 8-9 ingredients (current seed avg 8.5), so after staples about 5-6 non-staples are needed from a 8-item pantry; the match rate in a small corpus is low. With the 21-recipe seed the audit found 0-1.
- Rough prior (my judgment, not data): with ~600 recipes, a pantry like this plausibly yields roughly 5-20 matches with hierarchy rules; with a few thousand, it should clear 10 comfortably. A 2M-recipe set would return hundreds. **So ~600 recipes is borderline; the 10+ goal needs ~2,000-5,000 well-parsed everyday recipes or an "allow 1 missing ingredient" tier.**
- Mitigation independent of corpus size: show "1 ingredient away" as a second list (already supported by the existing missing-ingredients structure), and weight common-meal recipes.

**To de-risk before committing, do this measurement (I could not):** download RecipeNLG or the Food.com set on a normal connection *for measurement only*, run the section 2 pipeline on the 8+3 pantry and count full matches, then repeat on a random 600 and 3,000 subset to see how count scales with corpus size. ~1 hour of work; it decides whether TheMealDB+Wikibooks is enough.

## 4. Open items / UNVERIFIED list
- Official TheMealDB terms, current recipe count, whether DB copy is allowed.
- Spoonacular and Edamam current pricing, caching and attribution rules, free-tier card requirement.
- Wikibooks license text and the true recipe count; quality of its recipes.
- Food.com/Kaggle license; Open Recipes status.
- Accuracy of `ingredient-parser-nlp` on this project's lines; its LICENSE file (only PyPI metadata seen).
- All match-rate numbers in the sizing section.

## Sources
- Search summaries only (primary sites blocked): https://rapidapi.com/uk/thecocktaildb/api/themealdb/pricing ; https://tostracker.app/document/themealdbcom-tos ; https://apis.io/plans/spoonacular/spoonacular-plans-pricing/ ; https://developer.edamam.com/recipe-api ; https://developer.edamam.com/meal-planner-api ; https://huggingface.co/datasets/mbien/recipe_nlg ; https://github.com/Glorf/recipenlg ; https://paperswithcode.com/dataset/food-com-recipes-and-interactions ; https://en.wikibooks.org/wiki/Category:Recipes ; https://fdc.nal.usda.gov/download-datasets.html
- Package metadata fetched directly: https://pypi.org/pypi/ingredient-parser-nlp/json (MIT), https://pypi.org/pypi/ingredient-slicer/json (MIT), https://pypi.org/pypi/recipe-scrapers/json (MIT)
