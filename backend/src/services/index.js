import { randomUUID } from "node:crypto";
import { bad, missing, conflict } from "../lib/errors.js";
import * as v from "../lib/validation.js";
export function createServices(repos) {
  const get = async (repo, id, name) => {
    v.uuid(id, `${name.toLowerCase()}Id`);
    const row = await repo.findById(id);
    if (!row) throw missing(name);
    return row;
  };
  const accountRows = async () => {
    const [accounts, clients] = await Promise.all([
      repos.accounts.findAll(),
      repos.clients.findAll(),
    ]);
    const names = new Map(clients.map((c) => [c.clientId, c.companyName]));
    return accounts.map((a) => ({ ...a, companyName: names.get(a.clientId) }));
  };
  const transactionRows = async () => {
    const [transactions, accounts] = await Promise.all([
      repos.transactions.findAll(),
      accountRows(),
    ]);
    const index = new Map(accounts.map((a) => [a.accountId, a]));
    return transactions
      .map((t) => ({
        ...t,
        sourceAccount: index.get(t.sourceAccountId),
        destinationAccount: index.get(t.destinationAccountId),
      }))
      .sort(v.newest);
  };
  return {
    clients: {
      async list(q) {
        v.filters(q, { status: v.clientStatuses, industry: v.industries });
        const term = v.search(q);
        return v.paginate(
          (await repos.clients.findAll()).filter(
            (c) =>
              (!term ||
                c.companyName.toLowerCase().includes(term) ||
                c.registrationNumber.toLowerCase().includes(term)) &&
              (!q.status || c.status === q.status) &&
              (!q.industry || c.industry === q.industry),
          ),
          q,
        );
      },
      async detail(id) {
        const client = await get(repos.clients, id, "Client");
        return {
          ...client,
          accounts: (await accountRows()).filter((a) => a.clientId === id),
        };
      },
      async create(body) {
        const data = v.clientInput(body);
        const timestamp = new Date().toISOString();
        const client = {
          ...data,
          contactPhone: data.contactPhone || "",
          clientId: randomUUID(),
          status: "Active",
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        return repos.clients.insert(client, (rows) => {
          if (
            rows.some(
              (c) =>
                c.registrationNumber.trim().toLowerCase() ===
                data.registrationNumber.toLowerCase(),
            )
          )
            throw conflict(
              "A client with that registration number already exists.",
            );
        });
      },
      async update(id, body) {
        v.uuid(id, "clientId");
        const data = v.clientInput(body, true);
        return repos.clients.update(id, (existing) => {
          if (!existing) throw missing("Client");
          return { ...existing, ...data, updatedAt: new Date().toISOString() };
        });
      },
    },
    accounts: {
      async list(q) {
        v.filters(q, {
          clientId: "uuid",
          accountType: v.accountTypes,
          currency: v.currencies,
          status: v.accountStatuses,
        });
        return v.paginate(
          (await accountRows()).filter((a) =>
            ["clientId", "accountType", "currency", "status"].every(
              (k) => !q[k] || a[k] === q[k],
            ),
          ),
          q,
        );
      },
      async detail(id) {
        const account = await get(repos.accounts, id, "Account");
        return {
          ...account,
          client: await get(repos.clients, account.clientId, "Client"),
        };
      },
      async create(body) {
        v.allowed(body, [
          "clientId",
          "accountType",
          "currency",
          "balanceMinor",
        ]);
        v.uuid(body.clientId, "clientId");
        v.choice(body.accountType, "accountType", v.accountTypes);
        v.choice(body.currency, "currency", v.currencies);
        v.minor(body.balanceMinor);
        const client = await get(repos.clients, body.clientId, "Client");
        if (client.status !== "Active")
          throw conflict(
            "Only active corporate clients may receive new accounts.",
          );
        const account = {
          accountId: randomUUID(),
          clientId: body.clientId,
          accountType: body.accountType,
          currency: body.currency,
          balanceMinor: body.balanceMinor,
          status: "Active",
          createdAt: new Date().toISOString(),
        };
        return repos.accounts.store.update(async (rows) => {
          const current = await get(repos.clients, body.clientId, "Client");
          if (current.status !== "Active")
            throw conflict(
              "Only active corporate clients may receive new accounts.",
            );
          do {
            account.accountNumber =
              "SIM-" +
              randomUUID().replaceAll("-", "").slice(0, 18).toUpperCase();
          } while (rows.some((a) => a.accountNumber === account.accountNumber));
          return { rows: [...rows, account], result: account };
        });
      },
    },
    transactions: {
      async list(q) {
        v.filters(q, {
          sourceAccountId: "uuid",
          accountId: "uuid",
          status: v.transactionStatuses,
        });
        const term = v.search(q),
          { from, to } = v.dateRange(q);
        return v.paginate(
          (await transactionRows()).filter(
            (t) =>
              (!term || t.referenceNumber.toLowerCase().includes(term)) &&
              (!q.sourceAccountId || t.sourceAccountId === q.sourceAccountId) &&
              (!q.accountId ||
                t.sourceAccountId === q.accountId ||
                t.destinationAccountId === q.accountId) &&
              (!q.status || t.status === q.status) &&
              (!from || t.createdAt.slice(0, 10) >= from) &&
              (!to || t.createdAt.slice(0, 10) <= to),
          ),
          q,
        );
      },
      async detail(id) {
        await get(repos.transactions, id, "Transaction");
        return (await transactionRows()).find((t) => t.transactionId === id);
      },
    },
    dashboard: {
      async summary() {
        const [clients, accounts, transactions] = await Promise.all([
          repos.clients.findAll(),
          repos.accounts.findAll(),
          transactionRows(),
        ]);
        const transactionStatus = Object.fromEntries(
          v.transactionStatuses.map((s) => [
            s,
            transactions.filter((t) => t.status === s).length,
          ]),
        );
        return {
          metrics: {
            totalClients: clients.length,
            activeClients: clients.filter((c) => c.status === "Active").length,
            activeAccounts: accounts.filter((a) => a.status === "Active")
              .length,
            totalTransactions: transactions.length,
            pendingTransactions: transactionStatus.Pending,
            completedTransactions: transactionStatus.Completed,
            rejectedTransactions: transactionStatus.Rejected,
          },
          transactionStatus,
          recentTransactions: transactions.slice(0, 5),
        };
      },
    },
  };
}
