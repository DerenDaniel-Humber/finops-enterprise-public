import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { createRepositories } from "../src/repositories/index.js";
import * as v from "../src/lib/validation.js";
export function verifyDataset(
  { clients, accounts, transactions },
  minimums = true,
) {
  for (const rows of [clients, accounts, transactions])
    assert.ok(Array.isArray(rows), "Top-level data must be arrays.");
  const unique = (rows, key, normalize = (x) => x) =>
    assert.equal(
      new Set(rows.map((r) => normalize(r[key]))).size,
      rows.length,
      `Duplicate ${key}`,
    );
  const stamp = (value) =>
    assert.ok(
      typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
        Number.isFinite(Date.parse(value)) &&
        new Date(value).toISOString() === value,
      "Invalid UTC timestamp",
    );
  const ids = (rows, key) => {
    unique(rows, key);
    rows.forEach((r) => v.uuid(r[key], key));
  };
  ids(clients, "clientId");
  ids(accounts, "accountId");
  ids(transactions, "transactionId");
  unique(clients, "registrationNumber", (x) => x.trim().toLowerCase());
  unique(accounts, "accountNumber");
  unique(transactions, "referenceNumber");
  for (const c of clients) {
    v.clientInput(
      Object.fromEntries(
        [
          "companyName",
          "registrationNumber",
          "industry",
          "country",
          "contactEmail",
          "contactPhone",
        ].map((k) => [k, c[k]]),
      ),
    );
    v.choice(c.status, "status", v.clientStatuses);
    stamp(c.createdAt);
    stamp(c.updatedAt);
  }
  const clientsById = new Map(clients.map((c) => [c.clientId, c])),
    accountsById = new Map(accounts.map((a) => [a.accountId, a]));
  for (const a of accounts) {
    assert.ok(clientsById.has(a.clientId), "Orphan account");
    v.text(a.accountNumber, "accountNumber", 1, 60);
    v.choice(a.accountType, "accountType", v.accountTypes);
    v.choice(a.currency, "currency", v.currencies);
    v.choice(a.status, "status", v.accountStatuses);
    v.minor(a.balanceMinor);
    stamp(a.createdAt);
  }
  for (const t of transactions) {
    v.text(t.referenceNumber, "referenceNumber", 1, 60);
    const source = accountsById.get(t.sourceAccountId),
      destination = accountsById.get(t.destinationAccountId);
    assert.ok(source && destination, "Orphan transaction");
    assert.notEqual(source.accountId, destination.accountId);
    assert.equal(t.currency, source.currency);
    assert.equal(t.currency, destination.currency);
    v.minor(t.amountMinor, "amountMinor", true);
    assert.equal(t.transactionType, "Transfer");
    v.choice(t.status, "status", v.transactionStatuses);
    v.text(t.description, "description", 0, 250);
    stamp(t.createdAt);
  }
  if (minimums) {
    assert.ok(clients.length >= 10);
    assert.ok(accounts.length >= 20);
    assert.ok(transactions.length >= 50);
    assert.ok(new Set(clients.map((c) => c.industry)).size >= 5);
    assert.ok(clients.filter((c) => c.status !== "Active").length >= 2);
    assert.ok(accounts.filter((a) => a.status !== "Active").length >= 2);
    assert.equal(new Set(accounts.map((a) => a.currency)).size, 2);
    assert.equal(new Set(transactions.map((t) => t.status)).size, 3);
    assert.ok(new Set(accounts.map((a) => a.clientId)).size < accounts.length);
    assert.ok(new Set(accounts.map((a) => a.balanceMinor)).size > 1);
    assert.ok(
      Math.max(...transactions.map((t) => t.amountMinor)) >
        Math.min(...transactions.map((t) => t.amountMinor)) * 100,
    );
  }
  return {
    clients: clients.length,
    accounts: accounts.length,
    transactions: transactions.length,
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const repos = createRepositories(
    process.env.DATA_DIR
      ? resolve(process.env.DATA_DIR)
      : fileURLToPath(new URL("../data/", import.meta.url)),
  );
  const [clients, accounts, transactions] = await Promise.all([
    repos.clients.findAll(),
    repos.accounts.findAll(),
    repos.transactions.findAll(),
  ]);
  console.log(
    "Dataset verification passed:",
    verifyDataset({ clients, accounts, transactions }),
  );
}
