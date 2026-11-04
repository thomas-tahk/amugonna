# AI options and ingredient procurement — research
_2026-10-25. Branch `chief`. Sources are primary docs unless marked. "UNVERIFIED" = not confirmed from an official page._

## Bottom line
- AI is optional. Best candidate by far: **photo of fridge/pantry -> item list the user confirms** (attacks the assumed #1 friction, typing items). Costs ~$0.0003–0.007 per photo.
- Cheapest viable "get missing ingredients": **plain store-search / Instacart-style links, no API**, then upgrade to the Instacart Developer Platform shoppable-list link if the owner wants one-tap carts.
- Every AI feature below must be **suggest-then-confirm**; none should write to the pantry unreviewed.

---

## Pricing facts used (verified)
Source: https://platform.claude.com/docs/en/about-claude/pricing (fetched 2026-10-25; docs.anthropic.com redirects here).

| Model | Input /MTok | Output /MTok |
|---|---|---|
| Claude Haiku 5.5 (prompts <=100k tokens) | $0.10 | $0.50 |
| Claude Haiku 4.5 | $1 | $5 |
| Claude Sonnet 5.5 | $2 | $10 |
| Claude Opus 5.5 | $4 | $20 |

- Batch API: 50% off input and output (same page) — irrelevant for interactive use.
- Images: tokens = ceil(w/28) x ceil(h/28); a 1000x1000 image = 1,296 tokens; standard tier caps at ~1,568 tokens, high-res tier ("4.7 and later") caps at 4,784. Max 8000x8000 px, 10 MB base64 per image. Source: https://platform.claude.com/docs/en/build-with-claude/vision
- Vision limitations stated by Anthropic: may hallucinate on low-quality/rotated/small images (<200 px); **counting is approximate**; images not stored, not used for training (same page).
- Which resolution tier Haiku 5.5 / Sonnet 5.5 use: UNVERIFIED (page says "4.7 and later" = high-res; assumed). Cost estimates below assume photos downscaled client-side to ~1 MP (~1,300 tokens) so tier does not matter.
- Whether Haiku 5.5 reads messy fridge photos acceptably vs Sonnet 5.5: UNVERIFIED — needs a small eval on real photos before committing.

Cost assumptions per call: tokens in / out stated per row; formula = in x price + out x price.

---

## Part A — Where AI could cut friction

### A1. Fridge/pantry photo -> item list
- **User does:** snaps 1–3 photos (fridge shelf, pantry shelf). Reviews a checklist of detected items, unticks wrong ones, adds missed ones.
- **AI does:** vision call returning structured JSON of items (name, rough quantity optional) mapped to the app's ingredient vocabulary.
- **Failure mode:** misses items (back of shelf, opaque containers, items in cartons), mislabels (hallucinated "buttermilk"), wrong counts. Severity: **low** if confirm-screen exists (user fixes in seconds); **medium** if auto-saved (bad recipe matches, cook with ingredient you do not have).
- **Cost/use (~1,800 in, ~300 out per photo):** Haiku 5.5 ~$0.0003; Sonnet 5.5 ~$0.0066; Haiku 4.5 ~$0.0033. 3 photos on Sonnet ~$0.02.
- **Non-AI 80%?** Partly. Tap-to-tick list of ~150 common staples with search + "usual items" memory gets maybe 70–80% of fridge contents with no cost, and is the planned baseline. Photo wins for odd/long-tail items and first-time setup; it loses when the user already has a fast checklist.
- Verdict: **strongest candidate**, because typing/ticking at setup is the likeliest friction.

### A2. Receipt photo -> pantry
- **User does:** photographs a grocery receipt after shopping.
- **AI does:** OCR + expand abbreviations ("ORG BNLS CHKN BRST" -> chicken breast) + map to ingredient vocabulary; drop non-food lines.
- **Failure mode:** cryptic store abbreviations, crumpled/long receipts, non-food items, no quantities used/expiry. Severity: low with confirm screen.
- **Cost/use (~3,000 in, ~500 out):** Haiku 5.5 ~$0.0006; Sonnet 5.5 ~$0.011.
- **Non-AI 80%?** No good one: OCR is non-trivial and abbreviation mapping is the hard part. Some retailers expose digital receipts/purchase history, but no public API confirmed (UNVERIFIED).
- Verdict: nice once, but only helps people who shop then log; adds a second habit. Lower priority than A1.

### A3. Voice / free-text pantry entry ("eggs, half a bag of rice, spinach going bad")
- **User does:** types or dictates one line.
- **AI does:** parse to items + quantities + "use soon" flag.
- **Failure mode:** misparse of quantities; trivial to review. Severity: low.
- **Cost/use (~500 in, ~200 out):** Haiku 5.5 ~$0.00015; Sonnet 5.5 ~$0.003.
- **Non-AI 80%?** **Yes.** Phone keyboards/OS dictation already give text; a comma-split + fuzzy match against the ingredient list covers most of it. AI adds quantity/"going bad" parsing only.
- Verdict: non-AI wins. Skip AI initially.

### A4. Recipe import from URL / pasted text -> structured recipe
- **User does:** pastes a URL or text of a recipe they like.
- **AI does:** extracts title, ingredients (name/qty/unit), steps.
- **Failure mode:** wrong units, merged lines; ads/blog preamble. Severity: low-medium (a wrong ingredient quantity is annoying, not harmful).
- **Cost/use (~5,000 in, ~800 out):** Haiku 5.5 ~$0.0009; Sonnet 5.5 ~$0.018.
- **Non-AI 80%?** **Mostly yes for URLs.** Most recipe sites publish schema.org `Recipe` JSON-LD (general web knowledge, UNVERIFIED here for any specific site); parsing it deterministically is free and exact. AI is only needed as fallback for pasted prose or sites without JSON-LD. Ingredient-line parsing ("1 1/2 cups flour, sifted") has open-source non-AI parsers (not evaluated here).
- Verdict: JSON-LD first, AI fallback. Only matters if user-supplied recipes are a goal (ROADMAP says "users import/create their own"; vision's static dataset assumption makes it less central).

### A5. Ingredient normalization / substitution ("no buttermilk? milk + lemon")
- **User does:** sees a recipe that is 1 item short, taps "can I substitute?".
- **AI does:** suggests substitutes drawn from pantry contents with a caveat.
- **Failure mode:** confident but bad substitution (baking chemistry). Severity: medium for baking, low for cooking. This also directly raises the number of "makeable now" recipes — core to the app's point.
- **Cost/use (~400 in, ~250 out):** Haiku 5.5 ~$0.00017; Sonnet 5.5 ~$0.0033.
- **Non-AI 80%?** **Yes.** A curated substitution table (~100–200 well-known pairs) is static, free, deterministic, and can be checked. AI only for long tail. Could be pre-generated once by a model and human-reviewed, then shipped as data (zero runtime cost).
- Verdict: static table; optionally model-assisted authoring offline.

### A6. "What sounds good tonight" from a vague mood
- **User does:** types "something cozy and quick" or "not pasta".
- **AI does:** re-ranks the already-makeable recipe shortlist (text only; the candidate list is generated by the deterministic matcher, so AI cannot invent recipes).
- **Failure mode:** low — worst case a meh ranking; no hallucinated recipes if constrained to the candidate IDs. Cost is a small prompt with ~20 recipe titles.
- **Cost/use (~800 in, ~150 out):** Haiku 5.5 ~$0.00016; Sonnet 5.5 ~$0.0031.
- **Non-AI 80%?** Largely yes: filter chips (time <30 min, one-pot, cuisine, vegetarian, "use soon items first") cover most "moods" with zero ambiguity and are faster on a phone than typing. Free text adds delight, not necessity.
- Verdict: nice-to-have after chips exist. This is the safe way to reintroduce AI because it cannot repeat the Dec 2025 problem (generation quality).

### A7. Other credible ideas
- **"Use it up" expiry nudges** — not AI; needs only a date field.
- **Recipe generation from pantry** — the removed feature. Not re-proposed: owner already judged quality/cost bad; a 3,000-recipe dataset plus ranking replaces it.
- **Cook-mode step simplification** — out of the stated goal.

### Part A ranked shortlist
1. **A1 fridge/pantry photo -> confirmable item list** (Haiku 5.5 first, escalate to Sonnet 5.5 only if eval shows poor recall; ~$0.0003–0.007/photo). Hard rules: confirm screen, per-user rate/size limit, downscale to ~1 MP client-side, spend cap in the provider console.
2. **A6 mood re-rank over the deterministic shortlist** (after filter chips ship; cannot hallucinate recipes).
3. **A4 recipe import with JSON-LD first, AI fallback** (only if user-supplied recipes stay in scope).

**Skip-AI-entirely case:** a ticking checklist of staples with "usual items" memory + deterministic matcher + substitution table + filter chips delivers the whole done-gate with zero runtime cost, zero API key to secure, and no model-quality risk; AI only shaves setup time, which happens rarely after the pantry is seeded.

Cost sanity: 1,000 photos on Haiku 5.5 ~= $0.33; on Sonnet 5.5 ~= $6.60. Even at 100 users x 10 photos/month on Sonnet the bill is ~$7/month — "unpredictable cost" is controllable with caps, but only the owner can say if that is acceptable.

---

## Part B — Getting missing ingredients without building commerce

### B1. Instacart Developer Platform (IDP) — shoppable recipe / shopping-list links
- **API (verified from docs):** `POST https://connect.instacart.com/idp/v1/products/recipe`, `Authorization: Bearer <API-key>`. Required body: `title`, `ingredients[]` (each `name`, optional `measurements`, `product_ids`/`upcs`, filters). Optional `landing_page_configuration.partner_linkback_url` and `enable_pantry_items`, `expires_in` (default 30 days, max 365). Response: `products_link_url`. Source: https://docs.instacart.com/developer_platform_api/api/products/create_recipe_page
- **Other endpoints named in docs:** create shopping list page (`/developer_platform_api/api/products/create_shopping_list_page`), get nearby retailers (takes postal and country code). Source: https://docs.instacart.com/developer_platform_api/ — exact request shape of shopping-list endpoint not read: UNVERIFIED.
- **Sign-up:** self-serve dashboard creates Development or Production keys (https://docs.instacart.com/developer_platform_api/get_started/api-keys). **Approval criteria for Production keys, pricing, rate limits, US/Canada coverage: not stated in the pages read — UNVERIFIED.** Instacart's developer page (https://instacart.com/company/business/developers) says IDP can open monetization routes; affiliate commissions run through Impact.com, with rates conflicting across secondary sources (3% on Instacart's Tastemakers page per search snippet, 5% per a third-party blog) — treat as UNVERIFIED and possibly closed to new applicants.
- **UX:** app calls API with the missing ingredient list -> opens returned URL -> user picks store, sees matched products, checks out on Instacart. Missing-ingredients-only list is exactly what the endpoint takes. The API key must live server-side (Bearer secret).
- Fits "no commerce built": yes. Coverage is Instacart's own footprint (US/Canada generally, UNVERIFIED for specific areas).

### B2. Kroger public API (Cart API)
- Official portal: https://developer.kroger.com (my fetches of its docs returned no content; everything below is from **community sources, UNVERIFIED against official docs**): OAuth2 authorization-code flow with scope `cart.basic:write`; add items by UPC via a cart-add call; no checkout endpoint; items can be added but not removed. Also Products and Locations APIs.
- Sign-up/approval/rate limits/cost: UNVERIFIED.
- **UX:** user must log in with Kroger account (OAuth) in your app, then you add items to their cart. Heavy integration (OAuth per user, UPC resolution, Kroger family banners only — regional: Kroger, Fred Meyer, Ralphs, Fry's, etc.; not national).
- Verdict: too heavy and regional for v1.

### B3. Walmart
- developer.walmart.com lists Marketplace/supplier/advertising partner APIs, i.e. seller-side; **no consumer shopping/add-to-cart API found** (https://developer.walmart.com/). Affiliate links exist via an affiliate network (commonly Impact; UNVERIFIED). A documented add-to-cart URL format: **not confirmed from Walmart** — unofficial sources only; treat as UNVERIFIED. Plain Walmart search URLs work but are a manual per-item flow.

### B4. Amazon / Amazon Fresh
- Amazon's documented "Add to Cart form" (PA-API 5 docs) accepts `ASIN.n` + `Quantity.n` + `AssociateTag` and sends the user to Amazon's cart (https://webservices.amazon.co.jp/paapi5/documentation/add-to-cart-form.html — JP locale page; US URL table not retrieved). Requires knowing ASINs (needs product search, which needs PA-API access gated on Associates sales — UNVERIFIED) and may be dated. Grocery items map poorly to single ASINs; Fresh-specific deep link: UNVERIFIED.
- Verdict: poor fit for perishable/generic ingredients.

### B5. Generic search deep links (no API, no approval)
- Open the retailer's web search with the ingredient name (`https://www.instacart.com/store/s?k=...`, Walmart/Target/Amazon search URL patterns). **Search URL patterns are observed behavior, not documented contracts — UNVERIFIED and can break.** One ingredient per link; user does the rest.
- Pros: zero sign-up, zero cost, any retailer. Cons: no multi-item cart, no affiliate, fragile.

### B6. Non-link fallback
- "Copy missing items" (clipboard) and Web Share API to hand the list to Reminders/Notes/the user's grocery app. Web Share is browser-standard; no vendor dependency. Often what real people do anyway.

### Part B recommendation — simplest viable first version
1. **v1: "Missing items" list with Copy / Share button + per-item store-search links** (user-selectable default store; B5+B6). No keys, no approval, works in a day, fully reversible. Label search links best-effort.
2. **v2 (if owner uses it and wants one tap): Instacart IDP shopping-list/recipe link** (B1). Self-serve dev key; open question to resolve first: what Production approval requires and any fees. Server-side route only.
3. Defer Kroger/Walmart/Amazon: regional, OAuth-heavy, or no public consumer API.

## Open questions for the owner
1. Is typing/ticking pantry items actually the friction? (Decides whether A1 is worth anything.) Run ~20 real fridge photos through Haiku 5.5 and Sonnet 5.5 before building.
2. Acceptable monthly AI spend ceiling, and is a server-held API key acceptable?
3. Does the owner already use Instacart, or another grocer? Decides B1 vs B5 default.
4. Are user-imported recipes in scope (A4), or only the bundled dataset?
