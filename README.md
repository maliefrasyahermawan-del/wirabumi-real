# WIRABUMI

A real (not a demo/mockup) web app for Indonesian UMKM bookkeeping and KUR-loan
readiness: paste informal sales chat, get it turned into bookkeeping, a
computed feasibility score, and a real KUR loan-application PDF.

Stack: React + Vite frontend, Node/Express API, self-hosted PostgreSQL — no
external cloud services.

## Running the stack locally

You need three things running at once:

**1. PostgreSQL** — should already be running as a Windows service
(`postgresql-x64-18`). Check with:

```
Get-Service postgresql-x64-18
```

If it's stopped, start it with `Start-Service postgresql-x64-18` (from an
elevated PowerShell) or via the Services app.

The app connects to a dedicated `wirabumi` database under the `wirabumi_app`
role — see `server/schema.sql` for the schema (tables + scoring/KUR SQL
functions) if you ever need to recreate it from scratch.

**2. The API server** (Express, talks to Postgres):

```
npm run server
```

Runs on `http://localhost:4000` by default (see `PORT` in `.env`).

**3. The frontend** (Vite dev server):

```
npm run dev
```

Runs on `http://localhost:5173`. It talks to the API via `VITE_API_URL` in `.env`.

## Configuration

All config lives in `.env` (see `.env.example` for the shape):

- `DATABASE_URL` — Postgres connection string for the API server
- `JWT_SECRET` — signs auth tokens; keep this private
- `PORT` — API server port
- `VITE_API_URL` — where the frontend expects the API to be

## Architecture notes

- **Auth**: custom email/password (bcrypt + JWT), not a third-party auth
  provider. Tokens are stored in `localStorage` and sent as `Authorization:
  Bearer <token>`.
- **Scoring & KUR math**: implemented as PostgreSQL functions
  (`compute_score`, `get_kur_offer`) so the same formula backs both the
  per-user Skor/KUR pages and the aggregate Dinkop dashboard. See
  `server/schema.sql` for the actual formulas.
- **Chat parsing**: `src/lib/chatParser.js` is a rule-based (no external AI)
  heuristic parser for informal Indonesian sales chat. It's intentionally
  imperfect — the UI always shows an editable review table before anything
  is saved.
