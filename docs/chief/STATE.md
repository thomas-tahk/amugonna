# Chief state

Vision: [vision.md](vision.md)
Phase: Owner final local review
Branch: `local-core-allergens`, based on [merged M1](https://github.com/thomas-tahk/amugonna/pull/26).
Next action: Run `npm run dev:local` and follow the [local walkthrough](../LOCAL.md) on desktop and phone. Collect owner feedback and make requested adjustments before going live.
Waiting on owner: Final review of the local app and a hosted PostgreSQL choice. See the [deployment checklist](../PERSONAL-DEPLOY.md).

The prior session added ingredient exclusions and label confirmations, appearance settings, Korean recipe discovery and titles, private URL/text imports, favorites and notes, source-preserving edits, stable local sessions, backup tooling, and deployment preparation. See the [personal review plan](../superpowers/plans/2026-10-31-personal-review.md).

Prior verification recorded 970 server/client tests and 19 browser passes, with one phone-only case skipped on desktop. The live publisher import → edit → private save → favorite → note → cook flow ran locally. A restart preserved login, and a backup restore matched record counts in a disposable database.

Deployment: Automatic Vercel previews are disabled for this branch during local review. Hosting must satisfy the no-new-subscription and no-idle-suspension constraints.

Decisions: Korean discovery through more sources and visible titles, with existing ranking. The shelf links to publishers and imported recipe copies are private. Optional AI assistance, full KR/EN UI, photo entry and shopping lists remain later work.

Decision 2026-11-08: hosted DB = Neon free plan, a new database in his existing Neon account (data ~11 MB; scale-to-zero wake delay accepted; no new subscription). Owner local review passed; selection/matching nuance is long-term work, not a launch blocker.

Updated: 2026-11-08
