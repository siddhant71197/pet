# PawPlan

A pet-care web app for dogs and cats. Owners enter their pet's details and get
AI-generated insights and guides (nutrition, vaccination, medication, growth,
grooming, training), a vaccination plan with escalating alerts, and reminders
with browser notifications. Includes a modular pet-insurance ad tray with lead
capture.

Built with Next.js 16, Prisma (Postgres, e.g. Neon) and LLMs on [Replicate](https://replicate.com).

## Deploy on Vercel

1. Import this repo at https://vercel.com/new.
2. In the project, open **Storage** -> **Create Database** -> **Neon (Postgres)** and connect
   it to the project. This sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED` automatically.
3. In **Settings -> Environment Variables** add `REPLICATE_API_TOKEN` (and `ADMIN_PASSWORD`).
4. Redeploy. The `vercel-build` script creates the database tables (`prisma migrate deploy`).

## Local setup

Requires Node.js 20+ and a Postgres database (you can reuse the Neon database from Vercel).

```bash
npm install
cp .env.example .env        # then fill in the values below
npm run db:migrate          # creates the tables
npm run dev                 # http://localhost:3000
```

### Environment variables (`.env`)

| Variable | Purpose |
| --- | --- |
| `REPLICATE_API_TOKEN` | **Required for AI features.** Get one at https://replicate.com/account/api-tokens |
| `REPLICATE_MODEL` | `google/gemini-3.5-flash` (default) or `anthropic/claude-sonnet-5` |
| `REPLICATE_THINKING` | Gemini only: `none` (default), `low`, `high` |
| `REPLICATE_EFFORT` | Claude only: `low`, `medium` (default), `high` |
| `ADMIN_PASSWORD` | Password for `/admin/leads` and `/admin/ads` (admin is disabled when unset) |
| `AD_PROVIDER` | `placeholder` (default) or `clp` |
| `CLP_API_URL`, `CLP_API_KEY` | CLP ad provider settings (falls back to placeholders when unset) |
| `DATABASE_URL` | Postgres pooled connection string (set by Vercel's Neon integration) |
| `DATABASE_URL_UNPOOLED` | Optional direct connection string, used for migrations. Other names Vercel integrations use (`POSTGRES_URL`, `STORAGE_URL`, ...) are also detected. |

Never commit `.env`; it is git-ignored.

## Notes

- Users are anonymous: each browser gets a random ID stored in localStorage.
- Reminder notifications appear while the site is open in a browser tab.
- AI generations are rate-limited to 10 per browser per hour.
- To add an ad provider, see the comment at the top of `lib/ads/index.ts`.
- Secrets live only in `.env` locally and in the host's environment variables in
  production. `.env` is git-ignored.
