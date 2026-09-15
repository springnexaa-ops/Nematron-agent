# NEXA ERP (Pharma)

AI-backed pharmacy ERP by SpringNexa Private Limited.

## Two delivery modes

1. **NEXA ERP (Pharma) Desktop** — Windows Electron application designed for offline-first operation. Local data and the Nexa Offline Copilot continue to work without Internet. When connectivity returns, the sync queue can synchronize with the cloud API.
2. **NEXA ERP (Pharma) Cloud** — browser-based deployment using the same business concepts and UI, with an API for multi-device/branch access.

## Offline AI

The desktop build contains a local deterministic Nexa Offline Copilot for operational questions such as low-stock, expiry, sales, reorder and inventory summaries. It does not require an Internet connection. A pluggable local LLM adapter can be added later without changing ERP workflows.

## Pharmacy capabilities

- Medicine master
- Batch/lot inventory
- FEFO dispensing
- Expiry alerts
- Low-stock alerts
- POS billing
- Purchases and suppliers
- Customers/patients
- GST/HSN fields
- Sales and purchase reports
- Returns
- Audit events
- Offline-first local storage
- Sync queue and conflict-safe record IDs
- NEXA AI Copilot

The architecture is informed by common open-source pharmacy ERP patterns including batch/expiry tracking, FEFO, GST/HSN, POS, audit trails and reporting. See the project references documented in the parent NEXA AI project; do not copy GPL/proprietary code without license review.

## Desktop development

```bash
cd apps/nexa-erp-pharma/desktop
npm install
npm start
npm run dist
```

The Windows workflow in `.github/workflows/nexa-erp-pharma-windows.yml` builds the installer and publishes it as a GitHub Actions artifact.

## Cloud development

```bash
cd apps/nexa-erp-pharma/cloud
npm install
npm start
```

Open `http://localhost:8080`.

## Important production note

Before commercial deployment, replace the demo JSON cloud persistence with PostgreSQL, add tenant isolation, encrypted secrets, production authentication, backups, rate limiting, immutable audit storage, and India-specific pharmacy/legal compliance review.
