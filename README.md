# Document Intelligence Platform

An AI-powered system that classifies and extracts structured data from five
document types — resumes, invoices, bank statements, prescriptions, and
emails. Built as a CDAC learning project.

Every upload gets two things: an instant AI-generated preview (a few
seconds, via the Claude API) and a governed, audited pass through a
Databricks pipeline (Delta Lake tables, Unity Catalog) that's the real
system of record.

## Architecture

```
User's browser
      │
      ▼
Next.js frontend  ───────────────►  FastAPI backend
                                          │
                        ┌─────────────────┼───────────────────────┐
                        ▼                 ▼                       ▼
                    MongoDB          Claude API              Databricks Volume
                (accounts, file    (instant preview)          (raw files)
                  ownership)                                        │
                                                                     ▼
                                                          Databricks Job
                                                    (ingest → classify → validate → store)
                                                                     │
                                                                     ▼
                                                          Delta Lake tables
                                                          (Unity Catalog) ──► read by backend
```

## Tech stack

- **Frontend** — Next.js 16 (App Router), React 19, TypeScript
- **Backend** — FastAPI, Python 3.12
- **Auth / ownership store** — MongoDB
- **Data platform** — Databricks (PySpark, Delta Lake, Unity Catalog)
- **AI extraction** — Claude Haiku 4.5 (Anthropic API)

## Prerequisites

Before you start, make sure you have:

- **Node.js** 18 or newer, and npm
- **Python** 3.12 (or close to it)
- **MongoDB** running locally, or a MongoDB Atlas connection string
- A **Databricks workspace** (host URL, personal access token, SQL
  warehouse HTTP path, and Unity Catalog set up) — only needed if you want
  the real governed pipeline to work; the app still runs and shows an
  honest empty state without it
- An **Anthropic API key** (for the instant AI preview) — get one free at
  https://console.anthropic.com

Each person running this project should use their **own** Anthropic key and
their **own** Databricks credentials — never share real keys, and never
commit them to git. That's exactly what the `.env.example` files below are
for.

## First-time setup

### 1. Clone the repository

```
git clone https://github.com/dejatinrana/intelligent-document-processing.git
cd intelligent-document-processing
```

**If you want your own independent copy on your own GitHub account**
(instead of contributing back to the original repository), do this right
after cloning, before making any changes:

```
git remote remove origin
git remote add origin <your-own-empty-repo-url>
git push -u origin main
```

From that point on, your copy and the original are fully separate — pulling
or pushing on one side never affects the other.

### 2. Backend setup

```
cd backend
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Copy the example environment file and fill in your own values:

```
cp .env.example .env
```

Open `.env` and fill in:

- `JWT_SECRET_KEY` — any long random string (the file tells you a command to generate one)
- `MONGODB_URI` — leave as-is if MongoDB is running locally, otherwise your Atlas connection string
- `ADMIN_EMAILS` — your own email, so your account becomes admin
- `ANTHROPIC_API_KEY` — your own Claude API key
- The `DATABRICKS_*` values — your own workspace details (optional; skip if you don't have Databricks access yet, and set it up later from the app's Settings page instead)

Start the backend:

```
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend setup

In a separate terminal:

```
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

The default `.env.local` value (`http://localhost:8000`) is already correct
if you're running the backend on the same machine — no changes needed.

Open **http://localhost:3000** in your browser. Sign up for an account —
if your email matches `ADMIN_EMAILS` in the backend's `.env`, you'll have
admin access, including the Databricks connection settings and pipeline
controls.

### 4. Databricks pipeline (optional, for the full experience)

The `data-engineering/databricks/` folder has the notebooks used by the
pipeline: `1-ingestion`, `2-Text-Extraction` (does classification and
extraction together, via Claude), `5-Validation`, and
`6-Structured-Storage`. Notebooks `3` and `4` are kept for reference only
— they're not part of the active pipeline anymore.

To wire it up:

1. Import the four active notebooks into your Databricks workspace.
2. Create a Unity Catalog Volume for raw uploads, and a Databricks SQL
   warehouse.
3. Store your Anthropic API key as a Databricks secret (the notebook reads
   it via `dbutils.secrets.get`) rather than pasting it into the notebook.
4. Create a Databricks Job whose task graph runs those four notebooks in
   order, and grab its Job ID.
5. Fill in the `DATABRICKS_*` values and `DATABRICKS_JOB_ID` in the
   backend's `.env` — or add them later from the app's Settings page as an
   admin.

By default the pipeline only runs when an admin manually triggers it from
Settings ("Run pipeline now"), or on a schedule an admin picks — it never
fires automatically just because someone uploaded a file.

## Project structure

```
backend/            FastAPI app — routers, services, Claude + Databricks clients
frontend/           Next.js app — pages, components
data-engineering/
  databricks/        The pipeline notebooks
  sample-data/        A few real sample documents for testing
  testing/             Extra sample files + earlier notebook drafts
```

## Notes for anyone else picking this up

- Never commit a real `.env` or `.env.local` file — both are already
  git-ignored. Only the `.env.example` templates are tracked.
- The app is fully usable without Databricks configured — you'll just see
  an honest empty state on the Documents/Dashboard pages until it's set up.
- Admin status is decided purely by the `ADMIN_EMAILS` list in the
  backend's `.env` — no database flag to flip.
