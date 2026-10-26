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

## Open: AI's role
Undecided. Owner wants to see current state + where AI could have impact before deciding. → Research.

## Done-gate (draft, unconfirmed)
I open Amugonna on my phone, tick off what's in my fridge, and within seconds see a meal I can make right now, and I cook it.

## Assumptions
- **Assumption:** the existing auth, pantry CRUD, recipe CRUD and matching code still runs and is worth keeping.
- **Assumption:** the bundled static recipe dataset is big and varied enough that a typical pantry matches real meals.
- **Assumption:** pantry entry is the main friction point (typing items is tedious).
- **Assumption:** "getting missing ingredients fast" can link out to a grocery/delivery service without building commerce.
- **Assumption:** a hosting option exists that doesn't idle-pause (Render free tier sleeps).
