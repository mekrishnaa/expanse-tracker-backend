# Family Tracker — Backend Design Document

**Version:** 1.0
**Date:** 2026-08-30
**Status:** Approved for implementation
**Scope:** Backend for the Family Tracker PWA (React 19 + Vite + Dexie frontend)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [High-Level Design (HLD)](#2-high-level-design-hld)
   - 2.1 System Overview
   - 2.2 Architecture
   - 2.3 Technology Stack
   - 2.4 Component Breakdown
   - 2.5 Data Flow
   - 2.6 Multi-Tenancy Model
   - 2.7 Security Architecture
   - 2.8 Deployment Architecture (Free Tier)
   - 2.9 Non-Functional Requirements
3. [Low-Level Design (LLD)](#3-low-level-design-lld)
   - 3.1 Project Structure
   - 3.2 Database Schema (Prisma)
   - 3.3 API Specification
   - 3.4 Authentication & Authorization
   - 3.5 Middleware Pipeline
   - 3.6 Validation Layer
   - 3.7 Error Handling
   - 3.8 Migration Module
   - 3.9 Configuration & Environment
4. [Feature Implementation Matrix](#4-feature-implementation-matrix)
5. [Delivery Phases](#5-delivery-phases)
6. [Appendix](#6-appendix)

---

## 1. Introduction

### 1.1 Purpose
This document defines the High-Level Design (HLD) and Low-Level Design (LLD) for the Family Tracker backend. It is the single source of truth for implementing a multi-family, JWT-secured REST API that backs the existing offline-first PWA frontend.

### 1.2 Background
The frontend currently persists all data locally in the browser using **Dexie (IndexedDB)**, with settings held in `localStorage` via zustand. There is no server. This backend introduces:
- Persistent, cross-device storage.
- Multi-user families with isolated data.
- Authentication and authorization.
- One-time migration from local backups.

### 1.3 Goals
- Full REST API for every frontend entity.
- JWT authentication with per-family data isolation.
- Compatibility with the frontend's existing `exportJSON()` backup format for migration.
- Easy, free-tier deployment (Neon + Render + static host).
- Mobile-friendly (PWA + HTTPS API); local PIN lock preserved on the client.

### 1.4 Out of Scope (this version)
- Frontend refactor to consume the API (separate phase).
- Real-time websockets / live collaboration.
- Server-side storage of the device PIN (PIN remains a local device gate).
- File/receipt object storage (receipts remain base64 in-record for now).

---

## 2. High-Level Design (HLD)

### 2.1 System Overview

The system is a **stateless REST API** backed by PostgreSQL. Clients (the PWA on desktop or mobile) authenticate with JWT and perform CRUD on family-scoped resources. The API is the source of truth when online; the client keeps a Dexie mirror for offline use.

```mermaid
graph TD
    subgraph Client
      A[PWA - Desktop Browser]
      B[PWA - Mobile / Installed]
    end
    A -->|HTTPS + JWT| G[Express REST API]
    B -->|HTTPS + JWT| G
    G --> P[(PostgreSQL / Neon)]
    G --> L[Structured Logs]
```

### 2.2 Architecture

Layered, modular monolith:

```mermaid
graph LR
    R[Routes] --> C[Controllers]
    C --> S[Services]
    S --> PR[Prisma Client]
    PR --> DB[(PostgreSQL)]
    M[Middleware: Auth / Validate / Error / RateLimit] --> R
```

- **Routes** — declare endpoints, attach middleware.
- **Controllers** — parse request, call service, shape response.
- **Services** — business logic, always family-scoped, own DB access.
- **Prisma** — typed data access layer.
- **Middleware** — cross-cutting concerns (auth, validation, errors, rate limiting).

### 2.3 Technology Stack

| Concern | Choice |
|---|---|
| Language | TypeScript |
| Runtime | Node.js (LTS) |
| Framework | Express |
| ORM | Prisma |
| Database | PostgreSQL (Neon free tier, pooled connection) |
| Auth | JWT (access + refresh), argon2 password hashing |
| Validation | Zod |
| Security | Helmet, CORS, express-rate-limit |
| Logging | pino + pino-http |
| Package manager | npm |
| Money type | Prisma `Decimal` |
| Container | Docker (multi-stage) + docker-compose (local) |

### 2.4 Component Breakdown

| Component | Responsibility |
|---|---|
| Auth module | register (creates family + admin), login, refresh, logout, me |
| Family module | family profile, user invitations, role management |
| Members module | family member profiles (distinct from login users) |
| Categories module | expense/income categories |
| Accounts module | cash/bank/credit/etc. accounts |
| Transactions module | income/expense/transfer records + filtering |
| Budgets module | monthly per-category limits |
| Goals module | savings goals |
| Bills module | recurring bills + EMI tracking |
| Shopping module | lists + items |
| Notes module | notes |
| Templates module | quick-entry transaction presets |
| Settings module | per-user settings blob (cross-device sync) |
| Migration module | import/export full family backup (frontend JSON format) |

### 2.5 Data Flow

**Write (create transaction) example:**
```mermaid
sequenceDiagram
    participant Client
    participant API as Express
    participant Auth as Auth MW
    participant Val as Zod MW
    participant Svc as Service
    participant DB as Postgres
    Client->>API: POST /api/transactions (JWT, body)
    API->>Auth: verify token -> req.user{userId, familyId}
    Auth->>Val: validate body
    Val->>Svc: create(familyId, dto)
    Svc->>DB: insert with familyId
    DB-->>Svc: row
    Svc-->>Client: 201 Created (JSON)
```

### 2.6 Multi-Tenancy Model

- Root tenant entity: **Family**.
- Every domain row carries `familyId`.
- Services **always** filter by `req.user.familyId`; no query omits the tenant scope. This is enforced by a shared base-service pattern so no endpoint can leak cross-family data.
- A **User** (login identity) belongs to exactly one family and has a role (`admin | parent | child | guest`).
- A **FamilyMember** is a profile/person inside the family used for attributing transactions; it is separate from a login User (a child may be a member without a login).

### 2.7 Security Architecture

- **Passwords:** argon2id hashing, never stored or logged in plaintext.
- **Tokens:** short-lived access JWT (~15 min) + rotating refresh token (~7–30 days).
- **Transport:** HTTPS enforced by host; `trust proxy` enabled behind reverse proxy.
- **Headers:** Helmet defaults.
- **CORS:** locked to the configured frontend origin(s).
- **Rate limiting:** stricter limits on `/api/auth/*`.
- **Input validation:** Zod on body/params/query — mitigates injection and malformed input (OWASP A03).
- **Authorization:** tenant scoping + role checks on privileged routes (OWASP A01).
- **Secrets:** environment variables only; `.env` git-ignored, `.env.example` committed.
- **PIN:** remains a client-side device lock; never transmitted to or stored by the backend.

### 2.8 Deployment Architecture (Free Tier)

```mermaid
graph TD
    U[Mobile / Desktop User] -->|HTTPS| F[Frontend PWA<br/>Vercel / Netlify / Cloudflare Pages]
    F -->|HTTPS REST + JWT| B[Backend API<br/>Render Free Web Service]
    B -->|Pooled connection| N[(Neon Serverless Postgres<br/>Free Tier)]
```

| Layer | Free host | Notes |
|---|---|---|
| Database | Neon | Always-on free Postgres; use pooled connection string for Prisma |
| Backend | Render Web Service | Sleeps after ~15 min idle; cold start acceptable; `/health` for probes |
| Frontend | Vercel / Netlify / Cloudflare Pages | Static Vite build |

Artifacts included: `Dockerfile`, `.dockerignore`, `docker-compose.yml` (local API + Postgres), `render.yaml` blueprint, README deploy guide.

### 2.9 Non-Functional Requirements

| Attribute | Target |
|---|---|
| Availability | Best-effort (free tier; cold starts tolerated) |
| Security | JWT + tenant isolation + OWASP Top 10 hygiene |
| Performance | Indexed queries; pagination on list endpoints |
| Portability | 12-factor; env-driven; container-ready |
| Observability | Structured JSON logs; `/health` endpoint |
| Maintainability | Modular per-feature folders; typed end to end |
| Data integrity | FK constraints, cascade rules, `Decimal` money |

---

## 3. Low-Level Design (LLD)

### 3.1 Project Structure

```
Family_Tracker_backend/
├── src/
│   ├── config/
│   │   └── env.ts                 # typed env loader (zod-validated)
│   ├── lib/
│   │   ├── prisma.ts              # Prisma client singleton
│   │   ├── jwt.ts                 # sign/verify access & refresh
│   │   ├── password.ts           # argon2 hash/verify
│   │   └── logger.ts             # pino instance
│   ├── middleware/
│   │   ├── auth.ts               # JWT verify -> req.user
│   │   ├── requireRole.ts        # role guard
│   │   ├── validate.ts           # zod (body/params/query)
│   │   ├── error.ts              # centralized error handler
│   │   └── notFound.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.schema.ts
│   │   ├── families/
│   │   ├── members/
│   │   ├── categories/
│   │   ├── accounts/
│   │   ├── transactions/
│   │   ├── budgets/
│   │   ├── goals/
│   │   ├── bills/
│   │   ├── shopping/
│   │   ├── notes/
│   │   ├── templates/
│   │   ├── settings/
│   │   └── migration/
│   ├── utils/
│   │   ├── asyncHandler.ts
│   │   ├── ApiError.ts
│   │   └── pagination.ts
│   ├── routes.ts                 # mounts all module routers under /api
│   ├── app.ts                    # express app assembly
│   └── server.ts                 # bootstrap + graceful shutdown
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── docs/
│   └── BACKEND_DESIGN.md
├── .env.example
├── .dockerignore
├── Dockerfile
├── docker-compose.yml
├── render.yaml
├── package.json
├── tsconfig.json
└── README.md
```

Each module follows the same four-file pattern: `*.routes.ts`, `*.controller.ts`, `*.service.ts`, `*.schema.ts`.

### 3.2 Database Schema (Prisma)

> IDs are UUIDs. Money is `Decimal(14,2)`. Timestamps use `DateTime`. Every domain model has `familyId` + relation to `Family`. Enums mirror the frontend `types.ts`.

```prisma
// ---------- Enums ----------
enum TxnType     { expense income transfer }
enum MemberRole  { admin parent child guest }
enum AccountType { cash bank credit upi wallet investment }
enum BillFrequency { monthly weekly yearly quarterly once }

// ---------- Tenancy & Auth ----------
model Family {
  id        String   @id @default(uuid())
  name      String
  currency  String   @default("INR")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users         User[]
  members       FamilyMember[]
  categories    Category[]
  accounts      Account[]
  transactions  Transaction[]
  budgets       Budget[]
  goals         SavingsGoal[]
  bills         Bill[]
  shoppingLists ShoppingList[]
  shoppingItems ShoppingItem[]
  notes         Note[]
  templates     Template[]
  settings      Setting[]
}

model User {
  id           String     @id @default(uuid())
  familyId     String
  family       Family     @relation(fields: [familyId], references: [id], onDelete: Cascade)
  email        String     @unique
  passwordHash String
  name         String
  role         MemberRole @default(admin)
  refreshToken String?    // hashed current refresh token (rotation)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@index([familyId])
}

// ---------- Domain ----------
model FamilyMember {
  id            String   @id @default(uuid())
  familyId      String
  family        Family   @relation(fields: [familyId], references: [id], onDelete: Cascade)
  name          String
  role          MemberRole
  color         String
  avatar        String?
  monthlyBudget Decimal? @db.Decimal(14, 2)
  createdAt     DateTime @default(now())

  transactions  Transaction[]
  @@index([familyId])
}

model Category {
  id       String  @id @default(uuid())
  familyId String
  family   Family  @relation(fields: [familyId], references: [id], onDelete: Cascade)
  name     String
  type     TxnType
  icon     String
  color    String
  emoji    String?
  budget   Decimal? @db.Decimal(14, 2)
  order    Int
  archived Boolean  @default(false)

  transactions Transaction[]
  budgets      Budget[]
  bills        Bill[]
  templates    Template[]
  @@index([familyId, type])
}

model Account {
  id        String      @id @default(uuid())
  familyId  String
  family    Family      @relation(fields: [familyId], references: [id], onDelete: Cascade)
  name      String
  type      AccountType
  balance   Decimal     @db.Decimal(14, 2) // opening balance
  color     String
  icon      String
  createdAt DateTime    @default(now())

  transactions     Transaction[] @relation("FromAccount")
  transfersIn      Transaction[] @relation("ToAccount")
  templates        Template[]
  @@index([familyId])
}

model Transaction {
  id            String   @id @default(uuid())
  familyId      String
  family        Family   @relation(fields: [familyId], references: [id], onDelete: Cascade)
  type          TxnType
  amount        Decimal  @db.Decimal(14, 2)
  categoryId    String?
  category      Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  budgetId      String?
  memberId      String?
  member        FamilyMember? @relation(fields: [memberId], references: [id], onDelete: SetNull)
  accountId     String?
  account       Account? @relation("FromAccount", fields: [accountId], references: [id], onDelete: SetNull)
  toAccountId   String?
  toAccount     Account? @relation("ToAccount", fields: [toAccountId], references: [id], onDelete: SetNull)
  description   String?
  merchant      String?
  paymentMethod String?
  location      String?
  tags          String[]
  notes         String?
  receipt       String?  // data URL (base64) for now
  date          String   // ISO yyyy-mm-dd (kept as string to match frontend)
  time          String?  // HH:mm
  createdAt     DateTime @default(now())

  @@index([familyId, date])
  @@index([familyId, categoryId])
  @@index([familyId, memberId])
  @@index([familyId, accountId])
}

model Budget {
  id         String  @id @default(uuid())
  familyId   String
  family     Family  @relation(fields: [familyId], references: [id], onDelete: Cascade)
  categoryId String
  category   Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  month      String   // yyyy-mm
  limit      Decimal  @db.Decimal(14, 2)
  name       String?
  rollover   Boolean  @default(false)

  @@unique([familyId, month, categoryId])
  @@index([familyId, month])
}

model SavingsGoal {
  id            String   @id @default(uuid())
  familyId      String
  family        Family   @relation(fields: [familyId], references: [id], onDelete: Cascade)
  name          String
  emoji         String
  targetAmount  Decimal  @db.Decimal(14, 2)
  currentAmount Decimal  @db.Decimal(14, 2) @default(0)
  deadline      String?
  color         String
  createdAt     DateTime @default(now())
  completedAt   DateTime?

  @@index([familyId])
}

model Bill {
  id            String        @id @default(uuid())
  familyId      String
  family        Family        @relation(fields: [familyId], references: [id], onDelete: Cascade)
  name          String
  amount        Decimal       @db.Decimal(14, 2)
  categoryId    String?
  category      Category?     @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  dueDate       String        // ISO yyyy-mm-dd (next due)
  frequency     BillFrequency
  isEmi         Boolean       @default(false)
  emiTotalMonths Int?
  emiPaidMonths  Int?
  autoRepeat    Boolean       @default(false)
  paid          Boolean       @default(false)
  reminderDays  Int?
  createdAt     DateTime      @default(now())

  @@index([familyId, dueDate])
}

model ShoppingList {
  id        String   @id @default(uuid())
  familyId  String
  family    Family   @relation(fields: [familyId], references: [id], onDelete: Cascade)
  name      String
  emoji     String
  createdAt DateTime @default(now())

  items     ShoppingItem[]
  @@index([familyId])
}

model ShoppingItem {
  id            String   @id @default(uuid())
  familyId      String
  family        Family   @relation(fields: [familyId], references: [id], onDelete: Cascade)
  listId        String
  list          ShoppingList @relation(fields: [listId], references: [id], onDelete: Cascade)
  name          String
  qty           Int?
  estimatedCost Decimal? @db.Decimal(14, 2)
  purchased     Boolean  @default(false)
  createdAt     DateTime @default(now())

  @@index([familyId, listId])
}

model Note {
  id        String   @id @default(uuid())
  familyId  String
  family    Family   @relation(fields: [familyId], references: [id], onDelete: Cascade)
  title     String
  content   String
  pinned    Boolean  @default(false)
  color     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([familyId, updatedAt])
}

model Template {
  id            String   @id @default(uuid())
  familyId      String
  family        Family   @relation(fields: [familyId], references: [id], onDelete: Cascade)
  label         String
  emoji         String?
  type          TxnType
  amount        Decimal? @db.Decimal(14, 2)
  categoryId    String?
  category      Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  budgetId      String?
  memberId      String?
  accountId     String?
  account       Account? @relation(fields: [accountId], references: [id], onDelete: SetNull)
  paymentMethod String?
  description   String?
  tags          String[]
  createdAt     DateTime @default(now())

  @@index([familyId])
}

model Setting {
  id       String @id @default(uuid())
  familyId String
  family   Family @relation(fields: [familyId], references: [id], onDelete: Cascade)
  userId   String @unique
  data     Json   // full AppSettings blob (excluding raw PIN)
  updatedAt DateTime @updatedAt
}
```

**Schema notes**
- `date` / `dueDate` / `deadline` kept as `String` (yyyy-mm-dd) to match the frontend exactly and simplify migration; timestamps that are epoch-based on the client (`createdAt`, `updatedAt`) become `DateTime`.
- `tags` uses Postgres `String[]`.
- `receipt` stays a base64 data URL in-row for v1; can move to object storage later.
- Deleting a `Category`/`Account`/`Member` sets referencing `Transaction` FKs to `NULL` (preserves history); deleting a `ShoppingList` cascades its items.

### 3.3 API Specification

Base path: `/api`. All non-auth routes require `Authorization: Bearer <accessToken>`. All list endpoints support `?page`, `?pageSize`, and `?sort`.

#### 3.3.1 Auth
| Method | Path | Body | Response | Notes |
|---|---|---|---|---|
| POST | `/auth/register` | `{ familyName, name, email, password }` | `{ user, family, tokens }` | Creates family + first admin |
| POST | `/auth/login` | `{ email, password }` | `{ user, tokens }` | |
| POST | `/auth/refresh` | `{ refreshToken }` | `{ tokens }` | Rotates refresh token |
| POST | `/auth/logout` | `{ refreshToken }` | `204` | Invalidates refresh token |
| GET | `/auth/me` | — | `{ user, family }` | |

#### 3.3.2 Family & Users (admin-guarded where noted)
| Method | Path | Purpose |
|---|---|---|
| GET | `/family` | Get current family |
| PATCH | `/family` | Update family (admin) |
| GET | `/family/users` | List family login users |
| POST | `/family/users` | Invite/create user (admin) |
| PATCH | `/family/users/:id` | Update role (admin) |
| DELETE | `/family/users/:id` | Remove user (admin) |

#### 3.3.3 Generic CRUD (applies to each resource below)
Resources: `members`, `categories`, `accounts`, `transactions`, `budgets`, `goals`, `bills`, `shopping-lists`, `notes`, `templates`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/<resource>` | List (family-scoped, filtered, paginated) |
| GET | `/<resource>/:id` | Get one |
| POST | `/<resource>` | Create |
| PATCH | `/<resource>/:id` | Partial update |
| DELETE | `/<resource>/:id` | Delete |

**Resource-specific filters**
- `transactions`: `month=yyyy-mm`, `from`, `to`, `type`, `categoryId`, `memberId`, `accountId`, `tag`, `search`.
- `budgets`: `month=yyyy-mm`.
- `bills`: `dueBefore`, `paid`.
- `categories`: `type`, `archived`.
- `notes`: `pinned`, `search`.

#### 3.3.4 Shopping items (nested)
| Method | Path | Purpose |
|---|---|---|
| GET | `/shopping-lists/:listId/items` | List items of a list |
| POST | `/shopping-lists/:listId/items` | Add item |
| PATCH | `/shopping-lists/:listId/items/:id` | Update item |
| DELETE | `/shopping-lists/:listId/items/:id` | Delete item |

#### 3.3.5 Settings
| Method | Path | Purpose |
|---|---|---|
| GET | `/settings` | Get current user's settings blob |
| PUT | `/settings` | Upsert settings blob (PIN excluded) |

#### 3.3.6 Migration
| Method | Path | Body | Purpose |
|---|---|---|---|
| POST | `/migration/import` | `{ version, data: {...} }` | Import a frontend `exportJSON()` backup |
| GET | `/migration/export` | — | Return full family backup in frontend JSON shape |

#### 3.3.7 Health
| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness/readiness (DB ping) |

**Standard response envelope**
```jsonc
// success
{ "data": { /* resource or array */ }, "meta": { "page": 1, "pageSize": 20, "total": 42 } }
// error
{ "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [ … ] } }
```

### 3.4 Authentication & Authorization

**Token strategy**
- Access token: JWT, ~15 min, payload `{ sub: userId, familyId, role }`.
- Refresh token: JWT, ~7–30 days; hashed copy stored on `User.refreshToken`; rotated on each refresh; logout clears it.

**Flow**
```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    C->>A: POST /auth/login {email,password}
    A->>A: argon2.verify
    A-->>C: {accessToken, refreshToken}
    C->>A: GET /api/transactions (Bearer access)
    A-->>C: 200 data
    Note over C,A: access expires
    C->>A: POST /auth/refresh {refreshToken}
    A->>A: verify + rotate
    A-->>C: {new tokens}
```

**Authorization**
- `authenticate` middleware sets `req.user = { userId, familyId, role }`.
- `requireRole('admin')` guards family/user management routes.
- Services accept `familyId` and scope every query; controllers never trust client-supplied `familyId`.

### 3.5 Middleware Pipeline

Order of application in `app.ts`:
1. `helmet()`
2. `cors({ origin: env.CORS_ORIGIN, credentials: true })`
3. `express.json({ limit: '5mb' })` (large enough for receipt data URLs / imports)
4. `pino-http` request logging
5. Rate limiter (global light; `/auth` strict)
6. Routes (`/api/...`)
7. `notFound`
8. `errorHandler`

### 3.6 Validation Layer

- Each module has `*.schema.ts` with Zod schemas for `body`, `params`, `query`.
- `validate(schema)` middleware parses and replaces `req.body/params/query` with typed, sanitized values.
- Example (transactions create):
```ts
export const createTransactionSchema = z.object({
  body: z.object({
    type: z.enum(['expense', 'income', 'transfer']),
    amount: z.number().positive(),
    categoryId: z.string().uuid().optional(),
    memberId: z.string().uuid().optional(),
    accountId: z.string().uuid().optional(),
    toAccountId: z.string().uuid().optional(),
    description: z.string().max(500).optional(),
    merchant: z.string().max(200).optional(),
    paymentMethod: z.string().max(50).optional(),
    location: z.string().max(200).optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
    receipt: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  }),
})
```

### 3.7 Error Handling

- Custom `ApiError(statusCode, code, message, details?)`.
- `asyncHandler` wraps controllers so thrown errors reach the central handler.
- `errorHandler` maps:
  - `ApiError` → its status/code.
  - `ZodError` → `400 VALIDATION_ERROR` with `details`.
  - Prisma known errors (`P2002` unique, `P2025` not found, `P2003` FK) → `409/404/400`.
  - Unknown → `500 INTERNAL_ERROR` (message hidden in production, logged fully).

### 3.8 Migration Module

**Import** (`POST /migration/import`):
1. Accept frontend backup: `{ version, exportedAt, data: { transactions, categories, members, accounts, budgets, goals, bills, shoppingLists, shoppingItems, notes, templates } }`.
2. Run inside a single Prisma transaction, scoped to `req.user.familyId`.
3. Insert in dependency order and build an **old→new ID map**:
   `members → categories → accounts → budgets → goals → bills → shoppingLists → shoppingItems → notes → templates → transactions`.
4. Rewrite foreign keys (`categoryId`, `memberId`, `accountId`, `toAccountId`, `budgetId`, `listId`) using the ID map.
5. Return `{ inserted: {table: count}, idMap }`.

**Export** (`GET /migration/export`): reads all family rows and returns them in the same JSON shape the frontend `importJSON()` expects, keeping the existing backup/restore UI functional.

**Idempotency/safety:** import is additive by default; an optional `?mode=replace` clears existing family data first (mirrors frontend `importJSON` clear-then-add behavior).

### 3.9 Configuration & Environment

`.env.example`:
```
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require   # Neon pooled URL
JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=30d
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info
```
`config/env.ts` validates these with Zod at boot and fails fast if any are missing/invalid.

---

## 4. Feature Implementation Matrix

| Frontend feature | Backend support | Endpoint(s) |
|---|---|---|
| Transactions (income/expense/transfer) | Full CRUD + filters | `/transactions` |
| Categories | Full CRUD | `/categories` |
| Accounts & balances | Full CRUD | `/accounts` |
| Family members | Full CRUD | `/members` |
| Budgets (monthly per category) | Full CRUD + unique constraint | `/budgets` |
| Savings goals | Full CRUD | `/goals` |
| Bills & EMIs | Full CRUD + recurrence fields | `/bills` |
| Shopping lists & items | Full CRUD (nested) | `/shopping-lists`, `/…/items` |
| Notes | Full CRUD | `/notes` |
| Quick templates | Full CRUD | `/templates` |
| Settings sync | Get/Put blob | `/settings` |
| JSON backup/restore | Import/Export | `/migration/*` |
| CSV import/export | Stays client-side (uses `/transactions`) | — |
| Reports / stats / dashboard | Computed client-side from fetched data (v1) | list endpoints |
| PIN lock | Remains local device gate (not server-stored) | — |
| Multi-user family | Users + roles + isolation | `/auth`, `/family` |

> Reports/stats are computed on the client in v1 from fetched lists (matching current `stats.ts`). Server-side aggregation endpoints can be added later if needed.

---

## 5. Delivery Phases

1. **Scaffold** — package.json, tsconfig, Express app, env/config, logger, error handling, `/health`, Docker, docker-compose, render.yaml.
2. **Database** — full `schema.prisma`, initial migration, Prisma client, seed script (mirrors frontend `seed.ts`).
3. **Auth** — register/login/refresh/logout/me + JWT & role middleware.
4. **Core CRUD** — transactions, categories, accounts, members, budgets.
5. **Remaining CRUD** — goals, bills, shopping (lists+items), notes, templates, settings.
6. **Migration** — import/export endpoints.
7. **Docs & deploy** — README with local + free-tier deployment guide, endpoint reference, `.env.example`.

---

## 6. Appendix

### 6.1 Entity → Table Mapping
| Dexie store | Prisma model |
|---|---|
| transactions | Transaction |
| categories | Category |
| members | FamilyMember |
| accounts | Account |
| budgets | Budget |
| goals | SavingsGoal |
| bills | Bill |
| shoppingLists | ShoppingList |
| shoppingItems | ShoppingItem |
| notes | Note |
| templates | Template |
| (zustand settings) | Setting |
| (new) | Family, User |

### 6.2 HTTP Status Codes
| Code | Use |
|---|---|
| 200 | OK (get/update/list) |
| 201 | Created |
| 204 | No content (delete/logout) |
| 400 | Validation / bad FK |
| 401 | Missing/invalid token |
| 403 | Authenticated but not allowed (role) |
| 404 | Not found (or wrong family) |
| 409 | Conflict (unique constraint) |
| 429 | Rate limited |
| 500 | Internal error |

### 6.3 Future Enhancements (not in v1)
- Server-side reports/aggregation endpoints.
- Object storage for receipts.
- Real-time sync (WebSocket/SSE) for multi-device live updates.
- Hashed PIN + WebAuthn/biometric unlock on the client.
- Audit log of changes per family.
```
