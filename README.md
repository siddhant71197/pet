# PawPlan

A pet-care web app for dogs and cats. Owners enter their pet's details and get
AI-generated insights and guides (nutrition, vaccination, medication, growth,
grooming, training), a vaccination plan with escalating alerts, and reminders
with browser notifications. Includes a modular pet-insurance ad tray with lead
capture.

Built with Next.js 16, Prisma (SQLite) and LLMs on [Replicate](https://replicate.com).

## Setup

Requires Node.js 20+.

```bash
npm install
cp .env.example .env        # then fill in the values below
npx prisma migrate deploy   # creates the local SQLite database
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
| `DATABASE_URL` | SQLite file, default `file:./dev.db` |

Never commit `.env`; it is git-ignored.

## Notes

- Users are anonymous: each browser gets a random ID stored in localStorage.
- Reminder notifications appear while the site is open in a browser tab.
- AI generations are rate-limited to 10 per browser per hour.
- To add an ad provider, see the comment at the top of `lib/ads/index.ts`.
- When deploying to a serverless host, set the environment variables in the
  host's dashboard and switch to a hosted database (SQLite files are not persisted).
