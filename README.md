# Family Tracker — Backend API

REST API for the Family Tracker PWA. Multi-family, JWT-secured, built with **Express + TypeScript + Prisma + PostgreSQL**.

See [docs/BACKEND_DESIGN.md](docs/BACKEND_DESIGN.md) for the full HLD/LLD.

## Prerequisites

- Node.js 20+
- A PostgreSQL database (local, Docker, or Neon free tier)

## Quick start (local)

```bash
npm install
cp .env.example .env          # fill in DATABASE_URL and JWT secrets
npm run prisma:generate
npm run prisma:migrate        # creates tables (dev)
npm run seed                  # optional demo family + default data
npm run dev                   # http://localhost:4000
```

Health check: `GET http://localhost:4000/api/health`

### Local Postgres via Docker

```bash
docker compose up -d db       # starts Postgres on :5432
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/family_tracker?schema=public
```

Or run the whole stack (API + DB):

```bash
docker compose up --build
```

## Environment variables

| Var | Description |
|---|---|
| `NODE_ENV` | `development` \| `production` |
| `PORT` | HTTP port (default 4000) |
| `DATABASE_URL` | Postgres connection string (use pooled URL on Neon) |
| `JWT_ACCESS_SECRET` | Secret for access tokens (min 16 chars) |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens (min 16 chars) |
| `ACCESS_TOKEN_TTL` | e.g. `15m` |
| `REFRESH_TOKEN_TTL` | e.g. `30d` |
| `CORS_ORIGIN` | Comma-separated allowed frontend origins |
| `LOG_LEVEL` | pino log level |

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start with hot reload (tsx) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server |
| `npm run prisma:migrate` | Create/apply dev migration |
| `npm run prisma:deploy` | Apply migrations (production) |
| `npm run seed` | Seed demo data |
| `npm run prisma:studio` | Open Prisma Studio |

## API overview

Base URL: `/api`. All routes except `/auth/*` and `/health` require `Authorization: Bearer <accessToken>`.

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create family + first admin |
| POST | `/auth/login` | Log in, returns tokens |
| POST | `/auth/refresh` | Rotate tokens |
| POST | `/auth/logout` | Revoke refresh token |
| GET | `/auth/me` | Current user + family |

### Family & users (admin-guarded writes)
`GET/PATCH /family`, `GET/POST /family/users`, `PATCH/DELETE /family/users/:id`

### Resources (CRUD: `GET`, `GET /:id`, `POST`, `PATCH /:id`, `DELETE /:id`)
`/members`, `/categories`, `/accounts`, `/transactions`, `/budgets`, `/goals`, `/bills`, `/notes`, `/templates`

Common list filters:
- `transactions`: `month`, `from`, `to`, `type`, `categoryId`, `memberId`, `accountId`, `tag`, `search`, `page`, `pageSize`
- `budgets`: `month`, `categoryId`
- `bills`: `dueBefore`, `paid`
- `categories`: `type`, `archived`
- `notes`: `pinned`, `search`

### Shopping (nested)
`GET/POST /shopping-lists`, `PATCH/DELETE /shopping-lists/:id`
`GET/POST /shopping-lists/:listId/items`, `PATCH/DELETE /shopping-lists/:listId/items/:id`

### Settings
`GET /settings`, `PUT /settings` (per-user JSON blob; the device PIN is never sent here)

### Migration
- `POST /migration/import?mode=append|replace` — import a frontend `exportJSON()` backup
- `GET /migration/export` — download a frontend-compatible backup

## Deployment (free tier)

Recommended combo:

1. **Database — Neon** (free serverless Postgres): create a project, copy the **pooled** connection string into `DATABASE_URL`.
2. **API — Render** free Web Service: this repo includes [render.yaml](render.yaml). Set `DATABASE_URL` and `CORS_ORIGIN` in the dashboard; secrets are auto-generated. Build runs `prisma migrate deploy` automatically.
3. **Frontend — Vercel / Netlify / Cloudflare Pages**: deploy the Vite build and point it at the API URL.

> Render free instances sleep after ~15 min idle and cold-start on the next request. The `/api/health` endpoint can be pinged by a free uptime monitor to keep it warm.

### Docker

```bash
docker build -t family-tracker-api .
docker run -p 4000:4000 --env-file .env family-tracker-api
```

## Notes

- Money is stored as `Decimal(14,2)`.
- Dates like `date`/`dueDate` are kept as `yyyy-mm-dd` strings to match the frontend.
- Data is isolated per family; every query is scoped by the authenticated user's `familyId`.
- The app PIN lock stays on the device and is never stored server-side.
