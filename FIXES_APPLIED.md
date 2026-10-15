# Phase 2 QC fixes

Implemented fixes:

- Corrected the admin-login response handling and persist the short-lived token in a cookie so the server layout can read it.
- Removed the development-only fake admin session. The Next.js proxy now validates the token against the backend `GET /api/v1/admin/auth/me` endpoint.
- Replaced the invalid RBAC guard with a Nest guard factory and applied owner/manager and owner-only restrictions to the relevant admin mutations.
- Recorded cancellation history and audit events transactionally.
- Excluded inactive menu categories from the public menu query.
- Replaced the unrelated Phase 2 completion document with repository-accurate documentation.

Tests added:

- Reservation cancellation creates history and an audit event.
- Public menu query filters inactive categories.
