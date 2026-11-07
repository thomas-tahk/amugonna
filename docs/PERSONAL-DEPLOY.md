# Personal deployment — prepared, not published

Target gate: with the Mac switched off, open one HTTPS link on a phone, change the pantry, and see those changes and exclusions on the computer with the same account.

## Review boundary
The user requested one final review and adjustments before going live. No hosted resource, subscription, database migration, account creation or production deployment has been performed by this build.

## Existing stack
- Frontend: existing Vercel Vite project, root `client/`.
- Backend: separate Vercel Express project, root `server/`; `server/vercel.json` uses the officially supported Express framework. Keep the existing PostgreSQL/Prisma model.
- Database: hosted Postgres still must be selected. No accessible provider credentials or browser connection were available during preparation. The local database is not a live hosting substitute.

Two Vercel projects avoid rewriting the existing app or replacing the database. The frontend uses its configured backend URL directly. Never point an API client at its own Vercel deployment hostname as a proxy shortcut.

## Database constraint to settle before publication
The user wants no new subscription and no idle-pausing service. Neon's free plan suspends after inactivity and does not meet that requirement; it has not been selected. Paid always-on Postgres and a shared self-managed server remain options, not purchases. The app's deployment preparation does not resolve this service/budget choice by itself.

## Environment setup (values supplied privately)
Backend:
- `DATABASE_URL`: pooled PostgreSQL connection URI from the chosen provider.
- `DIRECT_URL`: direct PostgreSQL URI for Prisma migrations.
- `JWT_SECRET`: stable random production signing key; keep it stable across deployments.
- `PERSONAL_ACCESS_EMAIL`: owner's email; blocks other registrations/logins and rejects non-owner authenticated requests. Leave unset only for local/test instances or an intentional multi-user launch.
- `ALLOWED_ORIGINS`: exact frontend origin(s), comma separated.
- `NODE_ENV=production`.

Frontend:
- `VITE_API_URL=https://[backend-host]/api`.

Never put connection strings or signing keys in git or this document. Use the provider's environment settings. Inspect existing database contents and migration history before applying anything; do not blindly baseline or reset a populated database.

## Data and source content
- Make a local backup first: `npm run backup:local`; dumps stay under ignored `.local/backups/`.
- For an empty hosted database, apply Prisma migrations, then copy the user's local data through a tested dump/restore procedure. Verify user, pantry, recipes, favorites and notes counts before switching the frontend.
- Imported web recipes remain private per user. Curated Korean shelf entries are source links only; they do not bundle or republish the publishers' full recipes.
- TheMealDB imported data carries source credits. Recheck their production access terms before public distribution. Personal access is not a licence to redistribute other publishers' recipes.

## Final deployment sequence
1. User reviews local final build and approves remaining changes and hosting choice.
2. Provision/configure chosen Postgres, back up local data, perform and verify migration/copy.
3. Deploy backend preview with stable secret and owner restriction; smoke-test real registration/login, import, exclusions and notes.
4. Point frontend preview at that backend; execute the gate on desktop and an actual phone.
5. After explicit user approval, publish production and verify the same gate. Keep backup and rollback configuration.

## Official references checked
- https://vercel.com/docs/frameworks/backend/express
- https://vercel.com/docs/project-configuration/vercel-json
- https://vercel.com/docs/plans/hobby
- https://neon.com/docs/introduction/plans

Vercel Hobby is for personal/non-commercial use. A commercial launch requires reviewing that plan restriction separately.
