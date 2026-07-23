# WIRABUMI

A real (not a demo/mockup) web app for Indonesian UMKM bookkeeping and KUR-loan
readiness: paste informal sales chat or upload a transfer-confirmation photo,
get it turned into bookkeeping, a computed feasibility score, an AI-generated
plain-language explanation of that score, and a real KUR loan-application PDF.

Stack: React 19 + Vite frontend, Node/Express API, self-hosted PostgreSQL for
data and auth - no external cloud database. The only third-party service
called over the network is Groq (LLM), and only for 4 specific features, each
with an automatic rule-based fallback if it's unavailable - see
[AI in WIRABUMI](#ai-in-wirabumi) below.

For a full, brutally-honest walkthrough of every feature - what's real, what's
simple rule-based logic, and exactly where AI is and isn't involved - see
[`fitur_wirabumi.txt`](fitur_wirabumi.txt) (Indonesian). This README covers
setup and architecture; that file is the canonical feature reference and is
kept in sync with the app as it grows.

## Running the stack locally

You need three things running: PostgreSQL, the API server, and the frontend.

**1. PostgreSQL** - should already be running as a Windows service
(`postgresql-x64-18`). Check with:

```
Get-Service postgresql-x64-18
```

If it's stopped, start it with `Start-Service postgresql-x64-18` (from an
elevated PowerShell) or via the Services app.

The app connects to a dedicated `wirabumi` database under the `wirabumi_app`
role - see `server/schema.sql` for the full schema (tables + the
`compute_score`/`get_kur_offer` SQL functions) if you ever need to recreate it
from scratch.

**2. The API server** (Express, talks to Postgres):

```
npm run server
```

Runs on `http://localhost:4001` by default (see `PORT` in `.env`).

**3. The frontend** (Vite dev server):

```
npm run dev
```

Runs on `http://localhost:5173`. It talks to the API via `VITE_API_URL` in `.env`.

### Faster: `start.bat`

Once the one-time setup above (`npm install`, database created, `.env` filled
in) is done, `start.bat` in the project root is a quicker way to run the app
day-to-day. Double-click it (or run `wirabumi-launcher.ps1` directly) to get
an interactive terminal menu (arrow keys + Enter):

- **Nyalakan Website Wirabumi** - starts the backend and frontend if they
  aren't already running (checks the ports first, so it won't double-start),
  waits until both are actually reachable, then prints a clickable local link
  and opens it in your browser automatically.
- **Matikan Website Wirabumi** - stops both processes cleanly, found by the
  port they're listening on (not a blanket "kill all node processes").
- **Keluar** - closes the menu without stopping anything.

Logs from each run go to `.wirabumi-run/` (git-ignored). This is purely a
local convenience wrapper around the same two `npm` commands above - it
doesn't replace the one-time setup.

## Configuration

All config lives in `.env` (see `.env.example` for the shape):

- `DATABASE_URL` - Postgres connection string for the API server
- `JWT_SECRET` - signs auth tokens; keep this private
- `PORT` - API server port (default `4001`)
- `VITE_API_URL` - where the frontend expects the API to be
- `GROQ_API_KEY` - optional. Free key from
  [console.groq.com/keys](https://console.groq.com/keys). Powers 4 AI
  features (see below); if left empty, the app runs fully on rule-based
  fallbacks for those 4 features instead - nothing breaks or errors.

## Architecture notes

- **Auth**: custom email/password (bcrypt + JWT), not a third-party auth
  provider. Tokens are stored in `localStorage` and sent as `Authorization:
  Bearer <token>`. Password reset is self-service via two security questions
  (favorite food, favorite band) set at registration - no email/SMS provider
  is wired up.
- **Roles & access control**: 4 roles, each with a genuinely different
  dashboard - `umkm_owner` (default, sees only their own personal dashboard),
  `government` (Dinas Koperasi staff - aggregate dashboard, activity
  monitoring, impact/outreach dashboard), `bank_officer` (KUR partner bank -
  sees only UMKM who've opted in, reviews their credit profile), `super_admin`
  (everything above plus role management and a system-health page). Role is
  looked up fresh from the database on every request (not baked into the JWT,
  so a role change takes effect immediately). Access is enforced server-side
  (`requireRole` middleware, real HTTP 403s), not just hidden in the UI.
  `super_admin` can only be granted via direct database access, never through
  the app itself. The aggregate Dinkop dashboard used to be public; it's now
  private to `government`/`bank_officer`/`super_admin` only.
- **Bank consent**: a UMKM can opt in (off by default) to let a `bank_officer`
  see their business name, category, score, and KUR simulation - never raw
  transactions or chat history - and the bank can mark an application
  pending/approved/rejected.
- **Activity log**: key actions (register, login, add transaction/expense,
  generate a KUR document, update legal-document status, change a user's
  role, toggle bank consent, bank review decisions) are written to an
  `activity_log` table, feeding the admin monitoring dashboard (with a
  same-day breakdown by action type). Logging failures never block the
  action that triggered them.
- **Scoring & KUR math**: implemented as PostgreSQL functions
  (`compute_score`, `get_kur_offer`) so the same formula backs the per-user
  Skor/KUR pages, the Mas Sido chatbot, the quest system, and the aggregate
  Dinkop/Impact dashboards. See `server/schema.sql` for the actual formulas.
  These functions are never touched by the LLM - AI only narrates numbers
  that SQL already computed, never computes them itself.

## AI in WIRABUMI

Groq (`llama-3.3-70b-versatile`, via `server/lib/groqClient.js`) is used at 4
points, each with an automatic rule-based fallback if the call fails, times
out, or `GROQ_API_KEY` is empty - no feature ever goes fully offline because
of Groq:

1. **Chat parser** (Tempel Chat) - reads informal Indonesian sales-chat text
   and extracts transactions as structured data. Fallback: the original regex
   parser (`src/lib/chatParser.js`).
2. **Score narrative** - writes a 2-3 sentence plain-language explanation of
   the already-computed feasibility score. Fallback: a simple templated
   sentence built from the real numbers.
3. **Receipt OCR parser** - Tesseract.js (unchanged, runs 100% in-browser)
   reads text from an uploaded transfer-confirmation photo; the LLM then
   structures that often-messy OCR text into a transaction. Fallback: the
   original regex parser (`src/lib/receiptParser.js`).
4. **Mas Sido chatbot** - answers free-form questions about your own business
   data (score, KUR simulation, revenue, legal-document status), instructed
   to only use the data it's given and say "I don't know" rather than
   guessing. Fallback: the original keyword-matching engine
   (`src/lib/chatbotAnswer.js`).

Everywhere AI-assisted output is shown, a badge indicates which path actually
processed it ("✨ Diproses AI (Groq)" vs "⚙️ Mode cadangan (aturan)"). Full
detail, including exactly what each feature is and isn't allowed to do, is in
`fitur_wirabumi.txt`.
