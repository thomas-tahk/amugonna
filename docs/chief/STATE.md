# Chief state
Vision: docs/chief/vision.md (Shape round 1; done-gate draft unconfirmed)
Phase: Shape round 2 — research done, owner decides AI role + recipe data source
Research: docs/chief/research/current-state.md, docs/chief/research/ai-and-procurement.md
Key finding: dataset is the blocker (21 recipes, 40 ingredients, exact-name match → 1 match for a normal pantry). Fix data + fuzzy matching before any AI question matters.
Also: postinstall scripts/sync-docs.js rewrites docs with stale OpenAI text; no prisma migrations dir; server build needs prisma generate; local server/.env holds a live-looking OpenAI key (told owner to revoke)
Next action: owner picks AI role (photo→pantry / mood re-rank / import fallback / none) and recipe source; then Plan
Waiting on him: those two decisions (asked 2026-10-25)
Updated: 2026-10-25
