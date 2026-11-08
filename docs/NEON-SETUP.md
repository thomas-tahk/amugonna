# Neon setup — your steps (about 5 minutes)

Decision 2026-11-08: hosted database = Neon free plan, a new project in your existing Neon account. See [PERSONAL-DEPLOY.md](PERSONAL-DEPLOY.md) for the full deploy sequence.

You only do part A. Claude does part B after you reply.

## A. You (at home, on the Mac)

1. Open https://console.neon.tech and sign in with your existing account.
2. Click **New project**.
   - Name: `amugonna`
   - Postgres version: leave the default.
   - Region: **AWS US West (Oregon)** or the closest US region offered.
   - Click **Create**.
3. On the project dashboard, click **Connect** (top right).
4. In the dialog, keep database `neondb` and role `neondb_owner`. Copy two strings:
   - **Pooled**: toggle **Connection pooling ON** → copy the string (host contains `-pooler`).
   - **Direct**: toggle **Connection pooling OFF** → copy the string.
5. On the Mac, create the file `~/Projects/amugonna/.local/neon.env` (the `.local/` folder is git-ignored) with exactly two lines:
   ```
   DATABASE_URL="<pooled string>"
   DIRECT_URL="<direct string>"
   ```
   Quick way, in Terminal: `touch ~/Projects/amugonna/.local/neon.env && open -e ~/Projects/amugonna/.local/neon.env`, then paste both lines and save.
6. Don't paste the strings into chat, GitHub or any other file.
7. Tell Claude: **`neon ready`**.

## B. Claude (after `neon ready`)

1. Check the file has both lines (without printing them).
2. Back up local data: `npm run backup:local`.
3. Apply Prisma migrations to the empty Neon database.
4. Copy local data in; verify counts match local (users, pantry, recipes, favorites, notes).
5. With your OK, set Vercel env vars for backend preview (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `PERSONAL_ACCESS_EMAIL`, `ALLOWED_ORIGINS`, `NODE_ENV`) and frontend (`VITE_API_URL`), straight from files, never echoed.
6. Deploy previews, smoke-test login, pantry, exclusions, notes.
7. Hand you one HTTPS link for the phone test. Production only on your word.

## Known tradeoff

Neon free plan suspends the database after ~5 minutes idle; first request after that takes a second or two to wake. Accepted 2026-11-08.
