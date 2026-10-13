# FinOps Enterprise — Release 1

Corporate Financial Operations Portal for the fictional Northbridge Commercial Bank. This release centralizes corporate client registration, account administration, historical transfer investigation and operational reporting. It is an academic simulation; it does not execute payments or use real banking identifiers.

## Supplementary PDF report

[Technical and testing report](docs/FinOps_Release1_Report.pdf) provides the architecture, API catalogue, data rules, recorded validation results, all five technical reflection answers and selected desktop/tablet screenshots. The assignment does not explicitly request a separate PDF; this report supplements the required README and evidence. All ten original screenshots remain in `evidence/`.

Private repository: https://github.com/DerenDaniel-Humber/finops-enterprise

Public copy: https://github.com/DerenDaniel-Humber/finops-enterprise-public

Instructor access to the private repository still needs to be granted.

## Requirements and quick start

Use Node.js **22.9 or later** and npm. The application has two independent ES-module projects. No database server is required. The committed JSON files are the initial demonstration data; there is no automatic reset or seeding on startup.

Terminal 1, from the repository root:

```bash
cd backend
npm ci
cp .env.example .env
npm run verify:data
npm start
```

Terminal 2, from the repository root:

```bash
cd frontend
npm ci
cp .env.example .env
npm run dev
```

On Windows PowerShell use `Copy-Item .env.example .env` instead of `cp`. Open **http://127.0.0.1:5173**. The API health endpoint is **http://localhost:3000/api/v1/health**. `npm run dev` in the backend uses Node's watch mode. Stop each server with Ctrl+C.

Backend configuration: `PORT` defaults to 3000; `FRONTEND_ORIGIN` defaults to `http://localhost:5173`. For the default frontend command, set `FRONTEND_ORIGIN=http://127.0.0.1:5173` in `backend/.env` to match the URL you open. `DATA_DIR` optionally selects another existing directory of three JSON arrays; relative paths are resolved from the backend working directory. `frontend/.env` provides `VITE_API_BASE_URL`. Restart Vite after changing frontend configuration. Both `.env.example` files are committed; local `.env` files are ignored.

Build the frontend with `npm run build`; `npm run preview` serves that build on port 4173. Update `FRONTEND_ORIGIN` accordingly when testing preview. Production hosting must route unknown frontend paths back to `index.html` for React Router.

## Architecture and project structure

```text
backend/
  src/app.js               Express configuration; no listening side effects
  src/server.js            Configurable listener and graceful shutdown
  src/routes/              Versioned endpoints
  src/controllers/         HTTP translation, status codes and responses
  src/services/            Validation, business rules and aggregation
  src/repositories/        Resource repositories and queued JSON storage
  src/lib/                 Shared validation and error types
  data/                    clients.json, accounts.json, transactions.json
  scripts/verify-data.js    Repeatable dataset verification
  test/api.test.js          Isolated HTTP and storage integration tests
frontend/
  src/main.jsx             Application layout and routes
  src/pages/               Dashboard, directories, profiles and forms
  src/components/          Reusable fields, tables, states and pagination
  src/lib/                 Fetch client, request hook, exact money helpers
  test/money.test.js        Precision and formatting boundary tests
postman/                   Configurable API collection
scripts/                   Browser verification script
evidence/                 Actual test logs and desktop/tablet screenshots
```

Requests follow **route → controller → service → repository → JSON file**. Dashboard aggregation uses repositories and never accesses files directly. UI business records always come from the API; only supported field options and presentation labels are defined in components.

## REST API catalogue

All paths below have the prefix `/api/v1`. Successful resource responses use `{ "data": ... }`. Directory responses also contain `pagination: { page, pageSize, total, totalPages }`. The health response uses `{ "status": "ok", "timestamp": "<UTC ISO timestamp>" }`.

| Method | Path                 | Purpose / query filters                                                                                                              |
| ------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/health`            | Status and current server timestamp                                                                                                  |
| GET    | `/clients`           | `search`, `status`, `industry`, `page`, `pageSize`                                                                                   |
| POST   | `/clients`           | Register client; HTTP 201, resource and Location                                                                                     |
| GET    | `/clients/:id`       | Client profile including associated accounts                                                                                         |
| PATCH  | `/clients/:id`       | Change permitted fields; HTTP 200                                                                                                    |
| GET    | `/accounts`          | `clientId`, `accountType`, `currency`, `status`, `page`, `pageSize`                                                                  |
| POST   | `/accounts`          | Open account for an active client; HTTP 201                                                                                          |
| GET    | `/accounts/:id`      | Account profile including corporate owner                                                                                            |
| GET    | `/transactions`      | `search`, `sourceAccountId`, `status`, `from`, `to`, `page`, `pageSize`; optional `accountId` includes incoming and outgoing records |
| GET    | `/transactions/:id`  | Transfer details including both account objects                                                                                      |
| GET    | `/dashboard/summary` | Seven indicators, status counts and five recent transactions                                                                         |

Pagination defaults to 10 rows, maximum 100. Page numbers start at 1. Empty lists return totalPages 0. Text searches are partial and case insensitive. Date filters use `YYYY-MM-DD`, apply to UTC calendar days and include both endpoints. Invalid dates and reversed ranges return 400. Transactions sort newest first and use ascending transaction UUID as the timestamp tie breaker.

Example client creation body:

```json
{
  "companyName": "Example Engineering Ltd.",
  "registrationNumber": "EXAMPLE-001",
  "industry": "Technology",
  "country": "Canada",
  "contactEmail": "operations@example.com",
  "contactPhone": "+1-416-555-0100"
}
```

Client edits accept `companyName`, `industry`, `country`, `contactEmail`, `contactPhone` and `status`. IDs, registration numbers and timestamps cannot be submitted as edits. Account creation accepts `clientId`, `accountType`, `currency`, `balanceMinor`; for example `1250075` represents CAD 12,500.75. Initial client and account statuses are always Active. Unknown and immutable body fields are rejected.

Error contract:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid contact email.",
    "fields": { "contactEmail": "Enter a valid email address." }
  }
}
```

400 indicates invalid input; 404 indicates a missing resource or unsupported endpoint; 409 indicates duplicate registration or an inactive account owner; 500 indicates controlled storage or unexpected errors. Client deletion, account modification/closure and transaction mutations have no API endpoints.

## Data model and demonstration data

| Entity      | Stored fields                                                                                                                                                     |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client      | `clientId`, `companyName`, `registrationNumber`, `industry`, `country`, `contactEmail`, `contactPhone`, `status`, `createdAt`, `updatedAt`                        |
| Account     | `accountId`, `clientId`, `accountNumber`, `accountType`, `currency`, `balanceMinor`, `status`, `createdAt`                                                        |
| Transaction | `transactionId`, `referenceNumber`, `sourceAccountId`, `destinationAccountId`, `amountMinor`, `currency`, `transactionType`, `status`, `description`, `createdAt` |

The pristine dataset contains 10 clients across seven industries, including one Inactive and one Suspended client; 20 accounts with CAD and USD, including one Frozen and one Closed account; and 50 transfers (17 Completed, 17 Pending, 16 Rejected). Each client has two accounts. IDs and reference numbers are unique. Source and destination accounts differ and share the transfer currency. Balances and historical transfers are independent records.

Fresh dashboard: total clients 10, active clients 8, active accounts 18, total transactions 50, pending 17, completed 17, rejected 16. The five newest references are TXN-2026-000050 through TXN-2026-000046. The investigation reference TXN-2026-000001 is a Completed CAD 12.50 transfer.

Run `npm run verify:data` in the backend. The script checks quantities, fields, timestamps, unique identifiers, normalized registration uniqueness, all foreign keys, currencies, statuses, multiple-account ownership and monetary validity. It exits unsuccessfully for invalid data. Never restore demonstration files over live work; use a separate copied directory with `DATA_DIR` for disposable tests.

## Persistence and reliability

`JsonStore.read()` uses `node:fs/promises`, parses the JSON and rejects non-array content. Missing/unreadable or invalid JSON files cause a controlled `STORAGE_ERROR`; the code never replaces them with empty data. Update callbacks run after an existing-file read. Updates are serialized in a module-level queue keyed by the absolute file path, including updates through different repository instances. Registration uniqueness checks run inside that queue.

The updated dataset is written to a uniquely named temporary file in the same directory, then atomically renamed over the original. Failed serialization/write/rename leaves the original data intact; temporary files are cleaned when possible. No seed script executes at startup, so saved client edits and new accounts survive backend restarts.

This approach is for **one backend process**. It is not a multiprocess lock, does not offer a transaction spanning clients and accounts, and does not promise recovery from power loss without filesystem durability guarantees. Run one instance against a data directory. A database with transactions and constraints is the planned production extension.

## Automated testing and actual evidence

Backend:

```bash
cd backend
npm test
npm run verify:data
```

Frontend:

```bash
cd frontend
npm test
npm run build
```

The 16 backend integration tests use temporary copies and actual HTTP requests. They cover creation and updating, restart persistence, combined filters, date validation, lookup relationships, immutable fields, inactive clients, safe integer bounds, deterministic ordering, read-only restrictions, missing/corrupted files, concurrent duplicate registration, queued updates across instances, failed writes, empty datasets, health and controlled errors. Three frontend tests verify exact decimal conversion and currency formatting including the safe-integer boundary. Logs are in `evidence/`. The recorded run passed all 19 automated tests, all 35 Postman requests and all 40 Postman assertions.

### Postman collection

Import `postman/FinOps-Release1.postman_collection.json`. Set its `baseUrl` collection variable if needed. Run all requests in order using Collection Runner: the create request saves its new client ID for later update and account requests. The collection includes every endpoint and expected status assertions for valid input, duplicates, nonexistent resources and business-rule conflicts. **Run against a disposable copy of data** because the collection creates records and this release deliberately has no deletion APIs. It uses fixed IDs only for committed seed records; created IDs are captured dynamically.

### Browser checks

The Playwright script at `scripts/verify-browser.cjs` runs against a backend started with a **disposable data directory** and a running frontend. It verifies desktop and tablet layouts, navigation, client registration/editing, account creation, duplicate rejection, dashboard refresh, reference lookup, related-account links, dates, empty/loading/error states and Not Found. See `evidence/browser-tests.txt` and screenshots. To reproduce, install Playwright outside the two application projects:

```bash
npm install --no-save playwright
npx playwright install chromium
node scripts/verify-browser.cjs
```

Use `NODE_PATH` only if Playwright is installed in another directory. Default URLs are localhost ports 5173 and 3000, configurable with `UI_BASE_URL` and `API_BASE_URL`. Browser testing creates records in the configured backend, so do not point it at valuable data. It also mocks selected responses for loading, empty and error checks; the normal CRUD flow uses the real backend.

## Technical reflection

1. **Layer separation.** `routes/index.js` declares URLs and methods, `controllers/index.js` reads request parameters and sends response status/payloads, `services/index.js` implements uniqueness, client eligibility, filters and aggregate calculations, and `repositories/` owns persistence. `app.js` configures middleware and imports no listener. Putting business logic in routes would couple rules to HTTP and make reuse, isolated verification and future workflow services harder. The shared validation functions provide consistent field-level errors.

2. **Concurrent JSON updates.** Two reads of the same initial file can each append a record; the second write would discard the first append. `JsonStore.update()` chains a promise per absolute file path, then reads the latest dataset inside that chain. A failed operation does not block later updates. The duplicate check occurs inside the update callback. Tests exercise 20 concurrent client registrations and 25 updates across two store instances, plus concurrent duplicate requests. This does not replace cross-process database locking.

3. **Minor units.** Binary floating point cannot exactly represent many decimal fractions; multiplying and rounding arbitrary input can accept unwanted precision. `frontend/src/lib/money.js` validates decimal strings and uses BigInt arithmetic before converting an in-range result to Number. The service independently requires non-negative safe integers, valid currencies and types. Formatting divides integer minor units using BigInt so even the maximum safe amount retains its exact cents. An implementation challenge was ensuring CAD 12,500.75 is sent as 1250075 and rejecting a third decimal place rather than silently rounding it.

4. **Async React behavior.** `useResource` presents loading/error/success states and aborts stale fetches when paths change. The API helper propagates structured field errors and explains network failures. Required inputs, lengths, email type and select options provide preliminary validation. Client and account forms disable their fieldsets during requests and use a synchronous ref guard as well as state to prevent duplicate submissions. They redirect to the resulting details page with a confirmation. Directory filtering resets pagination to page 1. Browser checks verify error, loading, empty and successful states at desktop and tablet widths.

5. **Assignment 2 extension.** Reuse the app shell, API client, form fields, error handling, entity repositories and validation helpers. Add transaction initiation forms, transaction processing routes/controllers/services, lifecycle rules, approval entities and state transitions. Transfer execution must atomically update two balances and a transaction record; the existing per-file queue cannot guarantee that. Move persistence behind the repository interfaces to a transactional database, introduce idempotency keys and concurrency control, and test pending/completed/rejected transitions. Keep historical GET handlers side-effect free. Add authentication and roles in the release prescribed by the course rather than assuming this first release is secure for real operations.

## Submission and access checklist

The required submission is the **private GitHub repository URL**, named `finops-enterprise`, not an archive. Commit both projects, both lockfiles, demonstration JSON, README, Postman collection, evidence logs and screenshots. Do not commit `node_modules`, `.env` or frontend build output.

If creating the repository manually, create an empty private repository on GitHub, then from this project's root:

```bash
git init
git add .
git commit -m "Implement FinOps Enterprise release 1"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/finops-enterprise.git
git push -u origin main
```

In repository Settings → Collaborators, invite the instructor using their exact GitHub username or confirmed email. Confirm access before the deadline. Submit the repository's `https://github.com/.../finops-enterprise` URL in the LMS text editor. Repository creation, instructor access and LMS submission are external actions; their completion must be verified separately. Retain this codebase as the foundation for Assignment 2.
