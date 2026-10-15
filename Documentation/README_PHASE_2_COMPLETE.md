# Phase 2: Core API and Admin Dashboard

## Scope implemented in this repository

- Backend: NestJS, Prisma, PostgreSQL.
- Frontend: Next.js App Router.
- Admin authentication: tenant, email, and password login with a 15-minute JWT.
- Public menu, availability, and reservation endpoints.
- Admin menu, category, outlet, area, table, reservation, and audit-log endpoints.

## Security and data-integrity checks

- The Next.js proxy redirects unauthenticated admin requests and verifies the JWT through `GET /api/v1/admin/auth/me`.
- Owner/manager roles are required for changes to menu, categories, outlets, opening hours, areas, and tables. Deleting menu items or categories is owner-only.
- Cancelling a reservation records both `reservation_status_history` and `audit_events` in the same database transaction.
- The public menu excludes items in inactive categories while retaining uncategorized items.

## Run locally

1. Set `DATABASE_URL` and a strong `JWT_SECRET` in `apps/backend/.env`.
2. Install workspace dependencies from the repository root.
3. Run Prisma migration/generation for the backend database.
4. Start the API with `npm run dev:backend` and the frontend with `npm run dev:frontend`.

The frontend defaults to `http://localhost:4000/api/v1`. Set `NEXT_PUBLIC_API_URL` if the API runs elsewhere.

## Verification

Run:

```powershell
npm run test --workspace=apps/backend
npm run build
```

This document intentionally does not claim the Linear project is complete. Completion still requires passing the commands above and validating the applicable Linear acceptance criteria.
