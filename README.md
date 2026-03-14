# ExperimentVault

> "Never run the same A/B test twice."

A SaaS platform for product teams to store, search, and learn from their A/B experiments. Log every test you run, search past results semantically, and automatically catch duplicate experiments before they start.

## Features

- **Experiment library** — log all 22 fields per experiment including hypothesis, results, and learnings
- **Semantic search** — find past experiments by meaning, not just keywords (powered by pgvector + OpenAI embeddings)
- **Duplicate detection** — automatically warns when a new experiment is too similar to a past one
- **Data ingestion** — import via CSV, Optimizely integration, webhooks, or manual entry
- **Team workspaces** — multi-tenant with role-based access (admin / editor / viewer)
- **Digest emails** — weekly summaries of experiment activity per workspace

## Tech Stack

| Layer      | Technology                      |
| ---------- | ------------------------------- |
| Frontend   | Next.js 14 (App Router)         |
| Backend    | Fastify 5                       |
| Database   | PostgreSQL + pgvector           |
| ORM        | Drizzle ORM                     |
| Auth       | Clerk                           |
| Queue      | BullMQ + Redis                  |
| Embeddings | OpenAI `text-embedding-3-small` |
| Email      | Resend                          |
| Storage    | Cloudflare R2                   |
| Monitoring | Sentry + PostHog                |

## Monorepo Structure

```
experimentvault/
├── apps/
│   ├── web/          # Next.js 14 frontend (port 3000)
│   └── api/          # Fastify 5 backend (port 3001)
├── packages/
│   ├── db/           # Drizzle ORM schema + migrations + client
│   └── shared/       # Types, Zod schemas, constants shared across apps
├── .env.example      # All required environment variables
└── turbo.json        # Turborepo task pipeline
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+ — `npm install -g pnpm`
- PostgreSQL database (Railway recommended)
- Redis instance (Railway recommended)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/your-org/experimentvault.git
cd experimentvault

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env
# Fill in .env with your credentials (see required vars below)

# 4. Run database migrations
cd packages/db && pnpm db:migrate && cd ../..

# 5. Start development
pnpm dev
# → Frontend: http://localhost:3000
# → API:      http://localhost:3001
```

### Required Environment Variables

```bash
# Auth (Clerk — https://clerk.com)
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_WEBHOOK_SECRET=

# Database (PostgreSQL with pgvector)
DATABASE_URL=
REDIS_URL=

# OpenAI (embeddings)
OPENAI_API_KEY=

# Email (Resend — https://resend.com)
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# File Storage (Cloudflare R2)
CLOUDFLARE_R2_ACCESS_KEY=
CLOUDFLARE_R2_SECRET_KEY=
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_R2_ENDPOINT=

# Security — generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=

# App URLs
NEXT_PUBLIC_API_URL=http://localhost:3001
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

## Development Commands

```bash
pnpm dev          # Start all apps with hot reload
pnpm build        # Build all packages
pnpm lint         # Lint all packages
pnpm typecheck    # Type-check all packages
pnpm test         # Run all tests
pnpm format       # Format all files with Prettier
```

### Database (run from `packages/db/`)

```bash
pnpm db:generate  # Generate migration files from schema changes
pnpm db:migrate   # Apply migrations to database
pnpm db:studio    # Open Drizzle Studio (visual DB browser)
pnpm db:seed      # Seed with demo data
```

## CI/CD

- **CI** — GitHub Actions runs lint, typecheck, and build on every push and pull request
- **Frontend** — deployed to Vercel (auto-deploys on push to `main`)
- **API** — deployed to Railway (auto-deploys on push to `main`)

## Sprint Progress

| Sprint | Focus                                                    | Status      |
| ------ | -------------------------------------------------------- | ----------- |
| 0      | Project bootstrap (monorepo, schema, auth wiring)        | ✅ Done     |
| 1      | Foundation — auth flows, workspace CRUD, experiment CRUD | 🔲 Next     |
| 2      | Data ingestion — CSV, Optimizely, webhooks               | 🔲 Upcoming |
| 3      | Search & discovery — embeddings, pgvector                | 🔲 Upcoming |
| 4      | Core UI — list, detail, dashboard views                  | 🔲 Upcoming |
| 5      | Intelligence — duplicate detector, insights              | 🔲 Upcoming |
| 6      | Collaboration — comments, Slack, digest emails           | 🔲 Upcoming |

## License

Private — all rights reserved.
