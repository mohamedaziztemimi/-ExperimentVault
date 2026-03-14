# ExperimentVault — Developer Reference

> "Never run the same A/B test twice"
> A SaaS platform for teams to store, search, and learn from their A/B experiments.

---

## What Is This Project?

ExperimentVault lets product teams log every experiment they run, search past results semantically ("have we tested checkout before?"), and automatically detect when someone is about to run a duplicate test. It ingests data from CSV, Optimizely, webhooks, or manual entry.

**6-week MVP plan.** We are currently at the end of **Sprint 0** (infrastructure setup). Sprint 1 starts next.

---

## Where Is Everything?

```
C:\ExperimentVault\               ← monorepo root
├── apps/
│   ├── web/                      ← Next.js 14 frontend (port 3000)
│   └── api/                      ← Fastify 5 backend API (port 3001)
├── packages/
│   ├── db/                       ← Drizzle ORM schema + database client
│   └── shared/                   ← Types, Zod schemas, constants shared by all packages
├── .env.example                  ← Template for all required environment variables
├── .github/workflows/ci.yml      ← GitHub Actions CI (lint + typecheck + test on every PR)
├── turbo.json                    ← Turborepo task pipeline
├── pnpm-workspace.yaml           ← pnpm workspace config
└── SPRINTS.md                    ← (in C:\Users\azizt\OneDrive\Bureau\claude dev\.claude\)
```

**Package names** (used in imports across the repo):
| Folder | Package name |
|--------|-------------|
| `apps/web` | `@ev/web` |
| `apps/api` | `@ev/api` |
| `packages/db` | `@ev/db` |
| `packages/shared` | `@ev/shared` |

---

## Tech Stack

| Layer           | Technology                      | Why                                          |
| --------------- | ------------------------------- | -------------------------------------------- |
| Frontend        | Next.js 14 (App Router)         | SSR, file-based routing, server components   |
| Backend         | Fastify 5                       | Fast, low-overhead Node.js API server        |
| Database        | PostgreSQL + pgvector           | Relational data + vector similarity search   |
| ORM             | Drizzle ORM                     | Type-safe SQL, migrations, no magic          |
| Auth            | Clerk                           | Handles login/signup/OAuth, JWT verification |
| Job queue       | BullMQ + Redis                  | Background jobs (embeddings, email, sync)    |
| Embeddings      | OpenAI `text-embedding-3-small` | Semantic search for experiments              |
| Email           | Resend.com                      | Transactional + digest emails                |
| File storage    | Cloudflare R2                   | CSV import audit trail, workspace logos      |
| Monitoring      | Sentry + PostHog                | Error tracking + product analytics           |
| Package manager | pnpm 10                         | Fast, disk-efficient, workspace support      |
| Build tool      | Turborepo                       | Runs tasks across all packages in parallel   |

---

## Sprint Status

| Sprint   | Name                                            | Status      |
| -------- | ----------------------------------------------- | ----------- |
| Sprint 0 | Project Bootstrap                               | ✅ Done     |
| Sprint 1 | Foundation (Auth, DB, CRUD)                     | 🔲 Next     |
| Sprint 2 | Data Ingestion (CSV, Optimizely, form)          | 🔲 Upcoming |
| Sprint 3 | Search & Discovery (embeddings, pgvector)       | 🔲 Upcoming |
| Sprint 4 | Core UI (List, Detail, Dashboard)               | 🔲 Upcoming |
| Sprint 5 | Intelligence (duplicate detector, insights)     | 🔲 Upcoming |
| Sprint 6 | Collaboration & Polish (comments, Slack, email) | 🔲 Upcoming |

Jira board: https://aziztemimi.atlassian.net/jira/software/projects/DEV/boards

---

## Sprint 0 — What Was Done

Sprint 0 set up the entire development foundation. No business logic yet — just infrastructure.

### Monorepo (Turborepo + pnpm)

- Single repository with 4 packages managed by pnpm workspaces
- Turborepo orchestrates build/dev/lint/typecheck/test across all packages in the right dependency order
- `pnpm dev` from the root starts both the Next.js frontend AND Fastify API simultaneously with hot reload

### TypeScript — Strict Mode

All 4 packages share a common `tsconfig.base.json` with the strictest possible settings:

- `strict: true` — catches null issues, implicit any, etc.
- `noUncheckedIndexedAccess` — array[0] is typed as `T | undefined`
- `exactOptionalPropertyTypes` — `{ x?: string }` and `{ x: string | undefined }` are different
- `noUnusedLocals` / `noUnusedParameters` — dead code is a compile error

### Code Quality (ESLint + Prettier + Husky)

- **Prettier** formats code on save. Config: single quotes, no semicolons, 100 char line width
- **ESLint** enforces TypeScript rules (type-checked, consistent imports, no floating promises)
- **Husky** runs `lint-staged` before every git commit — staged files get auto-formatted and linted
- If ESLint errors remain after auto-fix, the commit is blocked

### Database Schema (Drizzle ORM)

All 12 tables are defined in `packages/db/src/schema/`. They are ready to be migrated — no database exists yet.

| Table               | Purpose                                                                      |
| ------------------- | ---------------------------------------------------------------------------- |
| `workspaces`        | Tenant root — every user belongs to one or more workspaces                   |
| `users`             | User accounts, synced from Clerk via webhook                                 |
| `workspace_members` | Join table: which users belong to which workspace, and at what role          |
| `experiments`       | Core table — stores all 22 fields per PRD including `embedding vector(1536)` |
| `tags`              | Workspace-scoped tags with colors                                            |
| `experiment_tags`   | Many-to-many between experiments and tags                                    |
| `comments`          | Threaded comments on experiments                                             |
| `activity_logs`     | Audit log — every create/update/delete on experiments                        |
| `integrations`      | Connected integrations (Optimizely, Slack) with encrypted credentials        |
| `invites`           | Pending email invitations to join a workspace                                |
| `digest_configs`    | Per-workspace weekly digest email settings                                   |
| `api_keys`          | API keys for programmatic access (hashed with bcrypt)                        |

**Key design decisions in the schema:**

- `workspace_members` join table (not `workspace_id` on `users`) → a user can belong to multiple workspaces
- `experiments.deleted_at` — soft delete, never hard-delete experiments
- `experiments.embedding vector(1536)` — stores OpenAI embedding for semantic search
- `experiments.status` — `draft | active | completed | stopped` (draft = autosaved, not shown in search)
- `integrations.credentials` — will be encrypted with AES-256 (pgcrypto) before storing

### API Server (Fastify)

Located at `apps/api/src/`. The server is wired up with:

**Plugins (middleware registered globally):**

- `@fastify/helmet` — security headers on every response
- `@fastify/cors` — only allows requests from origins in `CORS_ORIGIN` env var
- `@fastify/rate-limit` — 100 requests per minute per user
- `clerkPlugin` — verifies Bearer JWT token on every authenticated request, loads user + workspace role

**Authentication flow:**

1. Frontend sends `Authorization: Bearer <clerk_token>` on every API request
2. `clerkPlugin` calls `verifyToken(token)` against Clerk's public key
3. Looks up the user in the `users` table by `clerk_user_id`
4. Reads workspace membership from `workspace_members` using `X-Workspace-Id` header
5. Attaches `request.user = { userId, clerkUserId, workspaceId, role }` to the request
6. Any route that calls `fastify.authenticate` as a preHandler gets this automatically

**RBAC (Role-Based Access Control):**
Three roles with a hierarchy: `admin (3) > editor (2) > viewer (1)`
Use `requireRole('admin')` or `requireRole('editor')` as a Fastify `preHandler` on any route.

```typescript
// Example: only admins can delete
fastify.delete('/:id', { preHandler: [fastify.authenticate, requireRole('admin')] }, handler)
```

**Routes registered (all under `/api` prefix):**

- `/api/workspaces` — workspace CRUD
- `/api/users` — user listing and invites
- `/api/experiments` — experiment CRUD
- `/api/webhooks/clerk` — Clerk user sync webhook

**All API responses follow this shape:**

```json
{ "data": { ... }, "error": null }       // success
{ "data": null, "error": { "code": "...", "message": "..." } }  // error
```

### Frontend (Next.js 14)

Located at `apps/web/src/`.

**Authentication:**

- `middleware.ts` protects all routes using `clerkMiddleware`
- Public routes (no auth needed): `/login`, `/signup`, `/invite/:token`, `/api/webhooks/*`
- Authenticated users who hit a protected route get redirected to `/login?redirect_url=...`

**UI components already scaffolded:**

- `components/layout/sidebar.tsx` — left navigation sidebar
- `components/layout/topnav.tsx` — top navigation bar
- `components/ui/` — shadcn/ui base components (Button, Input, Badge, Card, Toast, Label)
- `hooks/use-toast.ts` — toast notification hook
- `lib/api.ts` — typed API client for calling the Fastify backend
- `lib/utils.ts` — `cn()` utility for Tailwind class merging

**Styling:**

- Tailwind CSS v3 with `@tailwindcss/typography` plugin
- Dark mode supported via `next-themes` (toggle in the UI)
- `prettier-plugin-tailwindcss` auto-sorts class names on format

### Shared Package (`@ev/shared`)

Contains types and schemas used by BOTH the frontend and backend — no duplication.

- `src/types/index.ts` — TypeScript types: `ExperimentResult`, `UserRole`, `ApiResponse<T>`, etc.
- `src/schemas/index.ts` — Zod validation schemas: `createExperimentSchema`, `searchSchema`, `paginationSchema`, etc.
- `src/constants.ts` — Plan limits, default thresholds, embedding config

**Important:** Any type that's used in both API and frontend goes in `@ev/shared`.

### Environment Variables

Copy `.env.example` to `.env` and fill in real values. The API server validates all required vars on startup via Zod — it will crash immediately with a clear error if something is missing.

```
# Critical for Sprint 1:
DATABASE_URL          PostgreSQL connection string (from Railway)
REDIS_URL             Redis connection string (from Railway)
CLERK_SECRET_KEY      From Clerk dashboard → API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY  From Clerk dashboard → API Keys
CLERK_WEBHOOK_SECRET  From Clerk dashboard → Webhooks
RESEND_API_KEY        From Resend.com
ENCRYPTION_KEY        32 random bytes in hex (64 chars) — for encrypting integration credentials
```

---

## How to Run the Project

### Prerequisites

- Node.js 20+
- pnpm 10+ (`npm install -g pnpm`)
- A `.env` file filled in from `.env.example`

### Install dependencies

```bash
cd C:\ExperimentVault
pnpm install
```

### Start development (both apps)

```bash
pnpm dev
# → Next.js frontend: http://localhost:3000
# → Fastify API:      http://localhost:3001
```

### Typecheck all packages

```bash
pnpm typecheck
# Should show: Tasks: 4 successful, 4 total
```

### Lint all packages

```bash
pnpm lint
```

### Run tests

```bash
pnpm test
```

### Database commands (from `packages/db/`)

```bash
cd packages/db

# Generate migration files from schema changes
pnpm db:generate

# Apply migrations to the database
pnpm db:migrate

# Open Drizzle Studio (visual DB browser)
pnpm db:studio

# Seed the database with demo data
pnpm db:seed
```

---

## What Needs to Happen Before Sprint 1 Code

Sprint 1 requires these external services to be provisioned first. These are one-time manual steps:

### 1. Railway.app — PostgreSQL + Redis

1. Go to https://railway.app → New Project
2. Add Service → Database → **PostgreSQL** → copy `DATABASE_URL`
3. Add Service → Database → **Redis** → copy `REDIS_URL`
4. Connect to PostgreSQL and run: `CREATE EXTENSION IF NOT EXISTS vector;`

### 2. Vercel — Frontend hosting

1. Go to https://vercel.com → Add New Project → import this GitHub repo
2. Set Root Directory: `apps/web`
3. Set Build Command: `cd ../.. && pnpm build --filter=web`
4. Add all `NEXT_PUBLIC_*` environment variables

### 3. Clerk — Authentication

1. Go to https://clerk.com → Create Application → name it "ExperimentVault"
2. Enable: Email + Password, Google OAuth
3. Copy `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
4. Webhooks → Add Endpoint → `https://your-api.railway.app/api/webhooks/clerk`
5. Subscribe to: `user.created`, `user.updated`, `user.deleted`
6. Copy `CLERK_WEBHOOK_SECRET`

### 4. Resend.com — Email

1. Go to https://resend.com → Create API key → add as `RESEND_API_KEY`
2. Domains → Add and verify your sending domain
3. Set `RESEND_FROM_EMAIL` to a verified address

### 5. Generate ENCRYPTION_KEY

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the output as `ENCRYPTION_KEY` in your `.env`.

---

## Sprint 1 — What Will Be Built Next

With services provisioned and `.env` filled, Sprint 1 implements:

1. **DB migrations** — run `pnpm db:migrate` to create all 12 tables in PostgreSQL
2. **Clerk webhook handler** — `/api/webhooks/clerk` already scaffolded, needs upsert logic verified
3. **Auth screens** — Login, Signup, workspace creation flow in Next.js
4. **Workspace API** — `POST /api/workspaces`, `GET /api/workspaces/:id`
5. **User management** — list members, invite by email (sends via Resend), role enforcement
6. **Experiment CRUD** — `GET/POST/PATCH/DELETE /api/experiments` with Zod validation + activity logging
7. **Tests** — Vitest unit tests for Zod schemas and RBAC, integration tests hitting real DB

Jira tasks: DEV-19 to DEV-41

---

## Key Conventions

### API response shape (always)

```typescript
// Success
{ data: T, error: null }

// Error
{ data: null, error: { code: string, message: string } }
```

### Workspace isolation (always)

Every database query that touches workspace-scoped data MUST filter by `workspace_id`. Never return data from another workspace.

### Timestamps

All timestamps stored as UTC in ISO 8601 format.

### Secrets

Never hardcode secrets. All config flows through `src/env.ts` which validates via Zod at startup.

### Imports

- Drizzle query helpers (`eq`, `and`, `sql`, etc.) → import from `@ev/db`, not from `drizzle-orm` directly. This avoids type conflicts from duplicate package copies.
- Shared types and schemas → import from `@ev/shared`
