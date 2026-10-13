import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, cp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { createApp } from "../src/app.js";
import { JsonStore } from "../src/repositories/json-store.js";
import { verifyDataset } from "../scripts/verify-data.js";
const seed = fileURLToPath(new URL("../data/", import.meta.url));
const payload = {
  companyName: "Test Engineering Ltd.",
  registrationNumber: "TEST-00001",
  industry: "Technology",
  country: "Canada",
  contactEmail: "ops@test.example",
  contactPhone: "",
};
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), "finops-test-"));
  await cp(seed, dir, { recursive: true });
  let server;
  const start = async () => {
    server = createApp({ dataDir: dir, logErrors: false }).listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    return `http://localhost:${server.address().port}/api/v1`;
  };
  let base = await start();
  const request = async (path, method = "GET", body) => {
    const response = await fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body !== undefined
        ? { body: typeof body === "string" ? body : JSON.stringify(body) }
        : {}),
    });
    return {
      status: response.status,
      body: await response.json(),
      headers: response.headers,
    };
  };
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  });
  return {
    dir,
    request,
    restart: async () => {
      await new Promise((resolve) => server.close(resolve));
      base = await start();
    },
  };
}
test("health, dashboard and data verification agree", async (t) => {
  const { request, dir } = await fixture(t);
  const health = await request("/health");
  assert.equal(health.status, 200);
  assert.equal(health.body.status, "ok");
  assert.ok(Date.parse(health.body.timestamp));
  const dataset = {};
  for (const key of ["clients", "accounts", "transactions"])
    dataset[key] = JSON.parse(await readFile(join(dir, key + ".json"), "utf8"));
  assert.deepEqual(verifyDataset(dataset), {
    clients: 10,
    accounts: 20,
    transactions: 50,
  });
  const summary = (await request("/dashboard/summary")).body.data;
  assert.deepEqual(summary.metrics, {
    totalClients: 10,
    activeClients: 8,
    activeAccounts: 18,
    totalTransactions: 50,
    pendingTransactions: 17,
    completedTransactions: 17,
    rejectedTransactions: 16,
  });
  assert.equal(summary.recentTransactions.length, 5);
  assert.equal(
    summary.recentTransactions[0].referenceNumber,
    "TXN-2026-000050",
  );
});
test("create, read, update, ownership and backend restart persistence", async (t) => {
  const f = await fixture(t);
  const created = await f.request("/clients", "POST", payload);
  assert.equal(created.status, 201);
  const c = created.body.data;
  assert.equal(c.status, "Active");
  assert.ok(created.headers.get("location").endsWith(c.clientId));
  const account = await f.request("/accounts", "POST", {
    clientId: c.clientId,
    accountType: "Operating",
    currency: "CAD",
    balanceMinor: 1250075,
  });
  assert.equal(account.status, 201);
  assert.equal(account.body.data.status, "Active");
  const second = await f.request("/accounts", "POST", {
    clientId: c.clientId,
    accountType: "Savings",
    currency: "USD",
    balanceMinor: 0,
  });
  assert.equal(second.status, 201);
  assert.notEqual(
    second.body.data.accountNumber,
    account.body.data.accountNumber,
  );
  const update = await f.request("/clients/" + c.clientId, "PATCH", {
    companyName: "Updated Engineering",
    status: "Active",
  });
  assert.equal(update.status, 200);
  await f.restart();
  const detail = (await f.request("/clients/" + c.clientId)).body.data;
  assert.equal(detail.companyName, "Updated Engineering");
  assert.equal(detail.accounts.length, 2);
  assert.equal(
    (await f.request("/accounts/" + account.body.data.accountId)).body.data
      .balanceMinor,
    1250075,
  );
  const metrics = (await f.request("/dashboard/summary")).body.data.metrics;
  assert.equal(metrics.totalClients, 11);
  assert.equal(metrics.activeAccounts, 20);
});
test("duplicate registration is trimmed and case insensitive, including parallel requests", async (t) => {
  const { request } = await fixture(t);
  const results = await Promise.all([
    request("/clients", "POST", payload),
    request("/clients", "POST", {
      ...payload,
      registrationNumber: " test-00001 ",
    }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal((await request("/clients?pageSize=100")).body.data.length, 11);
});
test("client validation and immutable fields", async (t) => {
  const { request } = await fixture(t);
  for (const body of [
    { ...payload, companyName: "" },
    { ...payload, contactEmail: "invalid" },
    { ...payload, industry: "Mining" },
    { ...payload, country: "Turkey" },
    { ...payload, status: "Active" },
    [],
  ])
    assert.equal((await request("/clients", "POST", body)).status, 400);
  const c = (await request("/clients")).body.data[0];
  for (const body of [
    { registrationNumber: "CHANGED" },
    { clientId: randomUUID() },
    { status: "Deleted" },
    { companyName: " " },
    {},
  ])
    assert.equal(
      (await request("/clients/" + c.clientId, "PATCH", body)).status,
      400,
    );
  const untouched = (await request("/clients/" + c.clientId)).body.data;
  assert.equal(untouched.registrationNumber, c.registrationNumber);
  assert.equal((await request("/clients/" + randomUUID())).status, 404);
  assert.equal(
    (
      await request("/clients/" + randomUUID(), "PATCH", {
        companyName: "New Name",
      })
    ).status,
    404,
  );
});
test("combined client search, pagination and filter validation", async (t) => {
  const { request } = await fixture(t);
  const list = await request(
    "/clients?search=MAPLE&industry=Manufacturing&status=Active",
  );
  assert.equal(list.body.data.length, 1);
  assert.equal(
    (await request("/clients?search=nb-2026-00001")).body.data.length,
    1,
  );
  assert.equal(
    (await request("/clients?search=unmatched")).body.data.length,
    0,
  );
  assert.equal(
    (await request("/clients?page=2&pageSize=3")).body.data.length,
    3,
  );
  for (const q of [
    "page=0",
    "pageSize=101",
    "page=1.5",
    "status=Wrong",
    "industry=Unknown",
    "search=a&search=b",
  ])
    assert.equal((await request("/clients?" + q)).status, 400);
});
test("account creation business rules and minor-unit validation", async (t) => {
  const { request } = await fixture(t);
  const clients = (await request("/clients?pageSize=100")).body.data;
  const data = {
    clientId: clients[0].clientId,
    accountType: "Operating",
    currency: "CAD",
    balanceMinor: 0,
  };
  for (const balanceMinor of [
    -1,
    1.01,
    "100",
    Number.MAX_SAFE_INTEGER + 1,
    null,
  ])
    assert.equal(
      (await request("/accounts", "POST", { ...data, balanceMinor })).status,
      400,
    );
  for (const more of [
    { currency: "EUR" },
    { accountType: "Current" },
    { status: "Frozen" },
    { clientId: "bad" },
  ])
    assert.equal(
      (await request("/accounts", "POST", { ...data, ...more })).status,
      400,
    );
  assert.equal(
    (await request("/accounts", "POST", { ...data, clientId: randomUUID() }))
      .status,
    404,
  );
  for (const client of clients.filter((c) => c.status !== "Active"))
    assert.equal(
      (
        await request("/accounts", "POST", {
          ...data,
          clientId: client.clientId,
        })
      ).status,
      409,
    );
  assert.equal(
    (
      await request("/accounts", "POST", {
        ...data,
        balanceMinor: Number.MAX_SAFE_INTEGER,
      })
    ).status,
    201,
  );
});
test("account combined filters and detail relationships", async (t) => {
  const { request } = await fixture(t);
  const a = (await request("/accounts")).body.data[0];
  const query = new URLSearchParams({
    clientId: a.clientId,
    accountType: a.accountType,
    currency: a.currency,
    status: a.status,
  });
  const result = await request("/accounts?" + query);
  assert.equal(result.body.data.length, 1);
  assert.equal(result.body.data[0].accountId, a.accountId);
  const detail = await request("/accounts/" + a.accountId);
  assert.equal(detail.body.data.client.clientId, a.clientId);
  assert.equal((await request("/accounts/" + randomUUID())).status, 404);
  assert.equal((await request("/accounts?currency=EUR")).status, 400);
});
test("transaction reference lookup, combined inclusive UTC dates and related accounts", async (t) => {
  const { request } = await fixture(t);
  const result = await request("/transactions?search=txn-2026-000001");
  assert.equal(result.body.data.length, 1);
  const tx = result.body.data[0];
  const query = new URLSearchParams({
    search: tx.referenceNumber,
    sourceAccountId: tx.sourceAccountId,
    status: tx.status,
    from: "2026-09-01",
    to: "2026-09-01",
  });
  assert.equal((await request("/transactions?" + query)).body.data.length, 1);
  const detail = (await request("/transactions/" + tx.transactionId)).body.data;
  assert.equal(detail.sourceAccount.accountId, tx.sourceAccountId);
  assert.equal(detail.destinationAccount.accountId, tx.destinationAccountId);
  assert.notEqual(detail.sourceAccountId, detail.destinationAccountId);
  const incoming = (
    await request(
      "/transactions?accountId=" + tx.destinationAccountId + "&pageSize=100",
    )
  ).body.data;
  assert.ok(incoming.some((row) => row.transactionId === tx.transactionId));
  assert.equal(
    (await request("/transactions?search=unmatched")).body.data.length,
    0,
  );
  assert.equal((await request("/transactions/" + randomUUID())).status, 404);
});
test("invalid dates, ranges, filters and pagination are rejected", async (t) => {
  const { request } = await fixture(t);
  for (const q of [
    "from=2026-10-02&to=2026-10-01",
    "from=2026-02-30",
    "to=yesterday",
    "from=2026-2-01",
    "status=Approved",
    "sourceAccountId=invalid",
    "pageSize=0",
  ])
    assert.equal((await request("/transactions?" + q)).status, 400);
});
test("newest ordering is deterministic with timestamp ties", async (t) => {
  const { request, dir } = await fixture(t);
  const rows = JSON.parse(
    await readFile(join(dir, "transactions.json"), "utf8"),
  );
  rows[0].createdAt = rows[1].createdAt = "2027-01-01T00:00:00.000Z";
  await writeFile(join(dir, "transactions.json"), JSON.stringify(rows));
  const result = (await request("/transactions")).body.data;
  assert.equal(result[0].transactionId, rows[0].transactionId);
  assert.equal(result[1].transactionId, rows[1].transactionId);
});
test("read-only endpoints never alter balances or historical records", async (t) => {
  const { request, dir } = await fixture(t);
  const before = await readFile(join(dir, "accounts.json"), "utf8");
  await request("/transactions");
  await request("/dashboard/summary");
  for (const [url, method] of [
    ["/transactions", "POST"],
    ["/transactions/" + randomUUID(), "PATCH"],
    ["/accounts/" + randomUUID(), "PATCH"],
    ["/accounts/" + randomUUID(), "DELETE"],
    ["/clients/" + randomUUID(), "DELETE"],
  ])
    assert.equal((await request(url, method, {})).status, 404);
  assert.equal(await readFile(join(dir, "accounts.json"), "utf8"), before);
});
test("corrupt, missing and wrong-shape files return controlled errors without overwrite", async (t) => {
  const { request, dir } = await fixture(t);
  const path = join(dir, "clients.json");
  for (const value of ["{broken", "{}"]) {
    await writeFile(path, value);
    assert.equal((await request("/clients", "POST", payload)).status, 500);
    assert.equal(await readFile(path, "utf8"), value);
  }
  await rm(path);
  const r = await request("/clients", "POST", payload);
  assert.equal(r.status, 500);
  assert.equal(r.body.error.code, "STORAGE_ERROR");
  await assert.rejects(readFile(path));
});
test("parallel writes are serialized across repository instances and recover after errors", async (t) => {
  const { dir, request } = await fixture(t);
  const responses = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      request("/clients", "POST", {
        ...payload,
        registrationNumber: "CONCURRENT-" + i,
      }),
    ),
  );
  assert.ok(responses.every((r) => r.status === 201));
  assert.equal((await request("/clients?pageSize=100")).body.data.length, 30);
  const path = join(dir, "queue.json");
  await writeFile(path, "[]");
  const a = new JsonStore(path),
    b = new JsonStore(path);
  await assert.rejects(
    a.update(() => {
      throw new Error("Rejected mutation");
    }),
  );
  await Promise.all(
    Array.from({ length: 25 }, (_, i) =>
      (i % 2 ? a : b).update(async (rows) => ({
        rows: [...rows, i],
        result: i,
      })),
    ),
  );
  assert.equal((await a.read()).length, 25);
});
test("failed writes preserve data", async (t) => {
  const { dir } = await fixture(t);
  const path = join(dir, "protected.json");
  await writeFile(path, "[1]");
  const store = new JsonStore(path);
  await assert.rejects(
    store.update(() => ({ rows: [{ invalid: 1n }], result: null })),
    (error) => error.code === "STORAGE_ERROR",
  );
  assert.equal(await readFile(path, "utf8"), "[1]");
});
test("empty datasets return zero metrics, empty arrays and zero total pages", async (t) => {
  const { request, dir } = await fixture(t);
  for (const name of ["clients", "accounts", "transactions"])
    await writeFile(join(dir, name + ".json"), "[]");
  const summary = (await request("/dashboard/summary")).body.data;
  assert.ok(Object.values(summary.metrics).every((value) => value === 0));
  assert.deepEqual(summary.recentTransactions, []);
  const page = (await request("/clients")).body;
  assert.equal(page.pagination.totalPages, 0);
  assert.deepEqual(page.data, []);
});
test("malformed JSON and unknown routes have controlled responses; CORS is configured", async (t) => {
  const { request } = await fixture(t);
  assert.equal((await request("/clients", "POST", "{broken")).status, 400);
  assert.equal((await request("/unknown")).status, 404);
  assert.equal(
    (await request("/health")).headers.get("access-control-allow-origin"),
    "http://localhost:5173",
  );
});
