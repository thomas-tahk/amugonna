# Local Amugonna

From the repo, run `npm run dev:local`, then open http://localhost:5173.

Requires Node, installed npm dependencies and PostgreSQL command-line tools on PATH (already available on this Mac). The launcher starts a dedicated Postgres cluster bound to 127.0.0.1:55439, applies migrations, seeds starter recipes and starts frontend/backend. It does not use or change server/.env database credentials.

Database files live in ignored `.local/postgres`; account, pantry, recipes, notes and exclusions survive app restarts. The launcher reuses `JWT_SECRET` from the environment or existing `server/.env` without changing that file, so sessions survive restarts until their normal expiry. Sign in once after the transition from the older temporary-key launcher. Ctrl-C stops the app; the dedicated database remains running. Stop it explicitly with `pg_ctl -D "$PWD/.local/postgres" stop` from the repo.

This Mac's catalogue contains 21 starter recipes and 790 recipes fetched from TheMealDB, with source attribution. These are database rows, not committed recipe data. A fresh database starts with 21 recipes; import more through the existing importer with the dedicated local DATABASE_URL and DIRECT_URL. No test-fixture recipes are seeded into the personal database.

Header Settings → Appearance offers Original (cream), Porcelain (neutral light), Coast (blue/teal), and Midnight (dark). Selection applies immediately and is saved on this browser, including after signing out and restarting the app.

## Try

1. Create an account. Open Kitchen → Foods to avoid, select Milk / dairy, optionally add a specific ingredient, then Save exclusions. Close the panel.
2. Add your actual ingredients through quick picks or free text → Check → Add. For a sample path: chicken, rice, garlic, broccoli, bell peppers, soy sauce, eggs, onion.
3. Tap See what I can cook. Open a Cook now recipe; inspect ingredient states and tick a cooking step.
4. Reload. Pantry and exclusions should remain. Change or clear exclusions to compare results.

Restrictions apply to recommendations, optional ingredients and pantry swaps. Direct recipe links show conflicts and review warnings. Unknown ingredients and known variable prepared foods are held back from recommendations while restrictions are active. Foods to avoid also lets you confirm ingredients whose actual product labels you checked; this clears uncertainty only, never explicit allergen/custom blocks. This is curated ingredient screening, not a complete allergen or cross-contact guarantee.

## Personal collection

My recipes has My recipes, Favorites and Korean shelf. Import recipe accepts a URL containing structured Recipe data, or pasted text with Ingredients and Instructions sections. Every import opens an editable preview and saves only after Save privately. The recipe is visible only to its owner, while public catalogue favorites remain accessible in Favorites.

The Korean shelf contains 16 source-specific links from Korean Bapsang/Hyosun. All were read successfully through the real importer. The shelf increases availability and visibility; it does not change matching rank. Korean names appear as subtitles beneath main titles, including after import and in cooking. Recipe bodies are fetched on demand into private copies, not bundled in git.

Imported amounts and original ingredient wording survive edits. Cooking shows the current amount and, where wording differs, the original source line. Recipes discovered in Cook can be saved directly to Favorites. Personal notes are stored per viewer, including on public recipes.

Import automation uses source data and text parsing, not AI-invented recipes. AI-assisted interpretation, photos, shopping lists and the standalone recipe database/API remain later goals. Full KR/EN interface translation is also later; this build adds Korean titles and the `아무거나` brand subtitle.

## Backups and live preparation

Run `npm run backup:local` to write a private dump under ignored `.local/backups/`. Backup restoration was exercised in a separate disposable database and account/recipe/pantry/note counts matched. Do not place dumps in git.

Live publication remains behind the user's final review. Vercel Express configuration, optional owner-email restriction, and a migration/backup sequence are documented in [PERSONAL-DEPLOY.md](PERSONAL-DEPLOY.md). A hosted Postgres provider and account access still need to be settled; no new subscription or hosted resource has been created.

## Changes

[M1](https://github.com/thomas-tahk/amugonna/pull/26) replaces the older Recipes/My Pantry layout with Kitchen/Cook/My recipes, a warm high-contrast palette, phone bottom navigation, quick-pick/free-text pantry entry, normalized matching, tiered results and a cooking view.

The local-core branch adds saved exclusions and checked-label confirmations, palette settings, the fish-cake settings icon, Korean subtitles and source shelf, personal URL/text imports, usable favorites and private notes, stable local sessions, backup/restore verification and deployment preparation. Hosting publication and merge remain deferred for final review.
