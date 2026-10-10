# Unified Notes integration (draft)

The canonical data model lives in `epic-tools-app` PR #72 (`epic_unified_notes`). C360 must show every note (customer and reservation), while Readiness displays only reservation notes with `visible_in_readiness=true`.

## Integration requirements
- Resolve C360 reservation identity to confirmation_code and readiness_id; customer-only notes must resolve customer_code.
- Continue honoring the existing Inbox/Team Thread notes and @mentions: migrate or bridge records rather than silently replacing them.
- Add Customer Note / Reservation Note selection. For Reservation Note show `Show in Readiness` checkbox, off by default; write to canonical record.
- Display Readiness-origin notes within C360 without duplicating them.
- Imported TripWorks notes must be read-only; the optional readiness visibility flag may be toggled.
- Use authenticated RPC for all data access; do not expose a Supabase service key to the browser.
- Verify legacy C360 note entry points, customer history, reservation drawers, and Readiness icon before deploying.

## Status
Draft integration contract only. No C360 runtime code or production deployment yet.
