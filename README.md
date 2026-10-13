# Clawholics

Nail salon appointment system: booking with Xendit downpayments, loyalty stamps by QR scan, and an admin CMS.

One Next.js 16 (App Router) app, deployed to Vercel. Clerk for auth, Supabase Postgres for data, Cloudflare R2 for images, Resend for email.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:5174
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev server, production build, production server |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests (`npm test -- --run` for one pass) |
| `npm run test:db` | Postgres integration tests against a throwaway Docker Postgres |
| `npm run db:export -- <dir>` | Read-only export of the live D1 database to JSON |
| `npm run db:copy -- <dir> [--replace]` | Load that export into the Supabase database in `DATABASE_URL` |

## Layout

- `src/app/` – routes: `(site)/` public pages, `(admin)/` admin screens (kebab-case URLs such as `/client-directory`), `api/` route handlers
- `src/views/`, `src/components/`, `src/hooks/`, `src/services/` – screens, components, hooks and API clients
- `src/server/` – server-only code: database, auth, R2, email and the API handlers
- `supabase/` – Postgres migrations, dev seed and the D1 copy scripts
- `wrangler.toml` – the legacy Cloudflare Worker's bindings, kept for the D1 export
