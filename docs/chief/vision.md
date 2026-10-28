# Amugonna — Vision
_Shape round 1, 2026-10-25_

## Intent
Lower the inertia of "what do I make right now?" Look at what's in your fridge and pantry, see what you can cook from it. Nothing else.

## Goals
- Personal use first (the owner), but anyone can sign up and use it.
- Pantry/fridge in → recipes you can make now out.
- Bonus: if you don't like your options, quick and fast ways to get the missing ingredients.

## Non-goals
- Macros, nutrition, health tracking. (Owner: "idgaf about macros.")
- Meal-planning calendar as the core. The 2025-12 roadmap made it core; owner's 2026-10-25 framing doesn't mention it. Treat as later or never.

## AI's role (decided 2026-10-25)
Two jobs only: (1) fridge/pantry photo → item list the user confirms; (2) mood re-rank ("something warm and quick") over recipes the matcher already found. AI never invents recipes. Matching stays algorithmic. Evidence: docs/chief/research/ai-and-procurement.md.

## (superseded) Open: AI's role
Undecided. Owner wants to see current state + where AI could have impact before deciding. → Research.

## Prerequisite before any AI
Real recipe data + fuzzy ingredient matching + free-text pantry items (audit: 21 recipes → 1 match for a normal pantry).

## Done-gate (revised by the owner 2026-10-28)
On my phone or my computer I put what's in my fridge and pantry into Amugonna, and within seconds of finishing I see recipes I can make with it, open one, and cook the meal from that screen.

(Previous draft, superseded: "I open Amugonna on my phone, tick off what's in my fridge, and within seconds see a meal I can make right now, and I cook it.")

## Assumptions
- **Assumption:** the existing auth, pantry CRUD, recipe CRUD and matching code still runs and is worth keeping.
  - **VERIFIED that it runs** (2026-10-25): all of it worked end-to-end over curl against a local Postgres; client and server build. See research/current-state.md sections 1-3. "Worth keeping" is still the owner's call; caveats: no migrations dir (deploy bug), no tests, no way to add new ingredients.
- **Assumption:** the bundled static recipe dataset is big and varied enough that a typical pantry matches real meals.
  - **REFUTED** (2026-10-25): 21 recipes / 40 ingredients, no normalization. An 8-item typical pantry returned 1 result (a 50% match); 14 items incl. staples returned 1 cookable-now. See research/current-state.md section 4.
- **Assumption:** pantry entry is the main friction point (typing items is tedious).
  - **STILL OPEN** (needs user observation). Audit only shows entry is search-and-add one item at a time with a 40-item catalog; the dataset size is a bigger blocker than entry today. See section 3.
- **Assumption:** "getting missing ingredients fast" can link out to a grocery/delivery service without building commerce.
  - **STILL OPEN** (not answerable from code). Only note: suggestions already return a structured missing-ingredients list per recipe to hang this on (section 5).
- **Assumption:** a hosting option exists that doesn't idle-pause (Render free tier sleeps).
  - **STILL OPEN.** Audit did not touch hosting; found that `render.yaml` runs `prisma migrate deploy` with no migrations present, so a fresh DB gets no schema. Live deployment unchecked (section 2).

## Owner answers, 2026-10-28
1. **Done-gate:** phone OR computer -> capture / share / update what's in the pantry and/or fridge -> find recipes that apply -> use a recipe to prepare the meal(s). Finding must be fast; cooking itself is not seconds. Pantry input must support **multiple methods over time** (tick list and free text now; photo later; maybe more). Done-gate above rewritten in this spirit.
2. **Recipes:** no paid monthly recipe APIs (no Spoonacular / Edamam subscriptions). Owner hoped for scraping / social media. Chief's position: bulk-scraping sites into a public app is legally risky, so the bundled base is free, license-clean sources (TheMealDB; Wikibooks Cookbook if feasible, with attribution). Social-media / URL recipes come later as a user's "bring your own" import (one user's own copy, not redistributed).
3. **Photo / scan recognition of food:** wanted, later milestone, not M1. Cost note: about $0.0003 per photo on Haiku 5.5.
4. **AI spend cap:** undecided. M1 uses no AI and no API keys.
5. **Getting missing ingredients:** nice to have, not core. At most a "copy missing items" button in M1.
6. **Import your own recipes (BYO):** later milestone, not M1.
7. **Existing code:** recycle what's usable, take it to the next level, polish where needed. Fix the known problems (no Prisma migrations, sync-docs postinstall rewriting docs with stale OpenAI text, no tests).
8. **Hosting:** undecided. Never a host or free tier that idle-pauses or sleeps. M1 doesn't deploy; runs locally and in CI; M1.md lists 2-3 non-pausing options with prices.

## Milestones (Plan, 2026-10-28)
- **M1 — Cook from my pantry** (this build): real recipe base, normalized + fuzzy matching, fast pantry entry on phone and desktop, "cook now" / "1 ingredient away", clean cook view, visual polish. Plan: docs/milestones/M1.md.
- **M2 — Deploy + dietary filters:** owner picks host; deploy with migrations; dietary/allergy filters over normalized ingredients; Wikibooks import if M1's corpus is thin.
- **M3 — Photo to pantry:** fridge/pantry photo -> confirm list (Haiku), behind the AI spend cap he sets.
- **M4 — Bring your own recipes:** URL import via schema.org JSON-LD, stored per user.
