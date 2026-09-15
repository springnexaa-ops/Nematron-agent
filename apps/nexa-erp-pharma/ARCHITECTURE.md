# NEXA ERP (Pharma) — Architecture

## Desktop / Offline

Electron + local JSON persistence in the user's application data directory. All core inventory data is local. The first AI copilot is deterministic and data-aware so it works with zero network connectivity.

## Online synchronization

Every local write can be placed in `syncQueue`. A future sync worker should POST idempotent events to `/api/sync`, using stable UUIDs and server-side conflict resolution. Do not use timestamp-only identifiers in production.

## Cloud

The reference cloud service exposes `/api/health`, `/api/data`, and `/api/sync`. Replace its in-memory store with PostgreSQL before production.

## Security requirements for production

- TLS everywhere
- short-lived access tokens + refresh rotation
- MFA for privileged users
- tenant/branch authorization on every API query
- encrypted local sensitive data
- immutable audit log
- encrypted backups
- least-privilege roles
- barcode/prescription workflow validation
- compliance review for applicable Indian pharmacy, GST, privacy and electronic-record requirements
