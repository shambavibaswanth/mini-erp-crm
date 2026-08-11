# Mini ERP + CRM Operations Portal

A small ERP/CRM system for a wholesale/distribution company: customers (CRM), products & inventory,
and a sales challan flow with real stock-deduction business logic.

- **Backend:** Node.js, TypeScript, Express, PostgreSQL (via Prisma ORM), JWT auth, zod validation
- **Frontend:** React 18, TypeScript, Vite, React Router, Axios (no UI framework — hand-built design system)
- **Auth:** JWT, 4 roles — Admin, Sales, Warehouse, Accounts

```
mini-erp-crm/
├── backend/     # Express API (TypeScript, Prisma, PostgreSQL)
├── frontend/    # React + Vite admin UI
├── docker-compose.yml
└── postman_collection.json
```

## 1. Architecture, in short

Layered backend: **routes → middleware (auth/role/validation) → controller → service → Prisma**.
Each business module (`auth`, `customers`, `products`, `challans`) is self-contained under
`backend/src/modules/<name>/` with its own schema (zod), service (business logic), controller
(HTTP glue), and routes (auth/role wiring). A single `ApiError` class + global error middleware
gives every failure a consistent `{ error: { message, details? } }` JSON shape and the right HTTP
status code.

The one piece of real domain logic worth calling out is the **sales challan → stock** flow
(`backend/src/modules/challans/challan.service.ts`):
- Every challan line item stores a **snapshot** of the product's name, SKU, and price at the time
  it was added, so editing a product later doesn't rewrite challan history.
- Confirming a challan (`POST /challans/:id/confirm`, or creating one directly with
  `status: "CONFIRMED"`) reduces stock for every line item **inside a single DB transaction**.
  If any line item doesn't have enough stock, `applyStockMovement` throws and the **whole
  transaction rolls back** — nothing is partially saved, and the API returns a 400 with a clear
  message naming the product and the shortfall.
- Cancelling a **confirmed** challan reverses the stock movements (adds the quantity back). Only
  **draft** challans can be edited or confirmed; confirmed/cancelled challans are final.

The frontend mirrors the same 4 modules as pages under `src/pages/`, with a shared Axios client
(`src/api/client.ts`) that attaches the JWT and redirects to `/login` on a 401, and role-aware UI
(buttons like "Add customer" or "Confirm challan" only render for roles allowed to do that action —
though the real enforcement is server-side, in `requireRole` middleware).

## 2. Setup — local development

**Prerequisites:** Node.js 20+, npm, and a PostgreSQL database (local, or a free hosted one — see
§4). Docker is optional and covered in §3.

### Backend

```bash
cd backend
cp .env.example .env        # then edit DATABASE_URL / JWT_SECRET
npm install
npx prisma migrate dev --name init   # creates tables from prisma/schema.prisma
npm run seed                         # creates 4 demo users + sample customer/product
npm run dev                          # http://localhost:4000
```

### Frontend

```bash
cd frontend
cp .env.example .env        # VITE_API_URL defaults to http://localhost:4000
npm install
npm run dev                 # http://localhost:5173
```

Log in with any of the seeded accounts (password `Password123!` for all):

| Role      | Email                  |
|-----------|-------------------------|
| Admin     | admin@example.com       |
| Sales     | sales@example.com       |
| Warehouse | warehouse@example.com   |
| Accounts  | accounts@example.com    |

### Environment variables

**Backend** (`backend/.env`):
| Variable | Purpose |
|---|---|
| `PORT` | API port (default 4000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Signing secret for auth tokens — set a long random value |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `8h` |
| `CORS_ORIGIN` | Comma-separated allowed frontend origin(s) |

**Frontend** (`frontend/.env`):
| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the backend API |

## 3. Docker (bonus)

```bash
docker compose up --build
```

This starts Postgres, the backend (migrations run automatically on container start via
`prisma migrate deploy`), and the frontend (served by nginx) on `http://localhost:5173`. Seed data
isn't run automatically inside the container — run it once against the containerized DB with:

```bash
cd backend
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mini_erp_crm?schema=public" npm run seed
```

## 4. Deploying to free hosting

AWS was treated as optional per the assignment; below is the free-tier path.

1. **Database** — create a free Postgres instance on [Neon](https://neon.tech),
   [Supabase](https://supabase.com), or Render Postgres. Copy the connection string into the
   backend's `DATABASE_URL`.
2. **Backend** — deploy `backend/` to [Render](https://render.com) or [Railway](https://railway.app)
   as a Node web service. Build command: `npm install && npm run build && npx prisma generate`.
   Start command: `npx prisma migrate deploy && npm start`. Set the env vars from §2.
3. **Frontend** — deploy `frontend/` to [Vercel](https://vercel.com) or
   [Netlify](https://netlify.com). Build command: `npm run build`, output dir: `dist`. Set
   `VITE_API_URL` to the deployed backend URL.
4. Update the backend's `CORS_ORIGIN` to the deployed frontend URL once you have it.
5. Run `npm run seed` once against the production `DATABASE_URL` to create the four demo logins
   (or use `POST /auth/register` as an Admin to create real accounts instead).

## 5. API reference

See `postman_collection.json` (import into Postman — it auto-saves the JWT from the login
response into a collection variable, so every subsequent request is authenticated). Full endpoint
list:

```
POST   /auth/login
POST   /auth/register        (Admin only)
GET    /auth/me

GET    /customers             ?search=&status=&customerType=&page=&pageSize=
POST   /customers             (Admin, Sales)
GET    /customers/:id
PATCH  /customers/:id         (Admin, Sales)
POST   /customers/:id/follow-ups   (Admin, Sales)

GET    /products              ?search=&category=&lowStockOnly=&page=&pageSize=
POST   /products               (Admin, Warehouse)
GET    /products/:id
PATCH  /products/:id           (Admin, Warehouse)
POST   /products/:id/stock-movements   (Admin, Warehouse)

GET    /challans               ?status=&customerId=&page=&pageSize=
POST   /challans                (Admin, Sales)
GET    /challans/:id
PATCH  /challans/:id            (Admin, Sales — draft only)
POST   /challans/:id/confirm    (Admin, Sales)
POST   /challans/:id/cancel     (Admin, Sales)

GET    /health
```

All list endpoints are paginated (`page`, `pageSize`) and return `{ items, meta }`. All write
endpoints validate input with zod and return `400` with a `details` array on failure. Every route
except `/auth/login` and `/health` requires `Authorization: Bearer <token>`.

## 6. Assumptions made

- Since the case study didn't specify per-role permissions beyond "role-based access exists," I
  assigned sensible ownership: Sales owns customers & challans, Warehouse owns products & stock,
  Accounts and all other roles have read access everywhere (they need visibility for invoicing/
  fulfilment) but can't mutate other teams' data. Admin can do everything, including creating
  new user accounts via `/auth/register`.
- "Invoices" are mentioned in the business context but not listed as a required module — this
  build focuses on the four explicitly required modules (auth, customers, products, challans).
  Invoicing would naturally build on top of confirmed challans (see §7).
- Challan numbers are generated as `CH-<year>-<sequential>`. This is simple and demo-appropriate;
  a high-concurrency production system would want a DB sequence or retry-on-conflict instead of a
  count-based number to fully rule out a race condition between two challans created in the same
  instant.
- "Add follow-up notes" (plural, in the CRM spec) is modeled as an append-only activity log
  (`CustomerNote`) rather than a single mutable notes field, since that's what a real CRM follow-up
  trail needs. A single free-text `notes` field also exists on the customer for general remarks.

## 7. Known limitations / not implemented

- No automated test suite (out of scope for the 48-hour window; the transaction-based stock logic
  in `challan.service.ts` is the highest-value place to add integration tests first).
- No PDF invoice export or S3 image upload (listed as bonus items, not required core modules).
- No GitHub Actions CI/CD pipeline is included.
- Pagination on the "low stock only" product filter is done in application code rather than at the
  DB layer (Prisma can't express a `currentStock <= minStockAlert` column-to-column comparison in
  `where` without raw SQL) — fine at small-to-medium catalog sizes, worth moving to a raw query or
  a generated/computed column if the product catalog grows large.
- No rate limiting or refresh-token rotation on the auth endpoints — the JWT simply expires after
  `JWT_EXPIRES_IN` and the user has to log in again.
