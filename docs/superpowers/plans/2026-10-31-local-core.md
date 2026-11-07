# Local core and ingredient exclusions

Goal: enter pantry items, save milk/dairy avoidance, discover a suitable recipe, and cook from its steps locally.

Approved scope: existing React/Express/Postgres application; personal local use first without removing accounts. Preserve existing presentation. Common allergen presets and custom ingredient exclusions affect recipes, optional ingredients and pantry substitutions. Unknown ingredients require review rather than being presented as suitable. Milk avoidance includes lactose-free dairy and milk proteins. No tolerance settings.

1. Run existing application against isolated local Postgres; verify existing end-to-end gate.
2. Write a browser test that saves milk avoidance and a custom exclusion, reloads, and verifies excluded recipes disappear. Verify red.
3. Add saved user exclusions, pure ingredient classification, authenticated preferences API and compact Kitchen settings. Filter matching and annotate direct recipe access. Verify unit, integration and browser tests.
4. Seed real local recipe catalogue, run phone and desktop journeys, leave a working local URL.

Next: personal recipe URL/text imports, favorites and notes. Later: shopping lists and photo-assisted pantry entry (AI proposes, human confirms). Older roadmap ideas are stretch goals. Hosting and public release deferred.

Checks: optional milk must exclude a recipe; milk protein/lactose-free dairy must not bypass avoidance; coconut milk and eggplant must not be false positives; forbidden pantry ingredients must not be offered as swaps; custom exclusions must persist per user; uncertain recipes must be visibly flagged and excluded from recommendations when restrictions are active.
