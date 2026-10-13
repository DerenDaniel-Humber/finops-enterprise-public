import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { query } from "../lib/api";
import { useResource } from "../lib/useResource";
import { money } from "../lib/money";
import { useOptions } from "./Accounts";
import {
  Heading,
  ResourceState,
  Field,
  Select,
  Pagination,
  TransactionTable,
  Details,
  Badge,
  ErrorMessage,
} from "../components/Common";
export default function Transactions() {
  const [params] = useSearchParams();
  const [filters, setFilters] = useState({
    search: "",
    sourceAccountId: params.get("sourceAccountId") || "",
    accountId: params.get("accountId") || "",
    status: "",
    from: "",
    to: "",
    page: 1,
  });
  const accounts = useOptions("/accounts"),
    resource = useResource("/transactions" + query(filters));
  const change = (key, value) =>
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  return (
    <>
      <Heading
        title="Transaction history"
        description="Investigate recorded transfers. All historical activity is read-only."
      />
      <section className="panel">
        {filters.accountId && (
          <div className="notice success">
            Showing incoming and outgoing transactions for this account.{" "}
            <button
              className="secondary"
              onClick={() => change("accountId", "")}
            >
              Clear account scope
            </button>
          </div>
        )}
        <ErrorMessage error={accounts.error} />
        <div className="filters transaction-filters">
          <Field label="Reference number">
            <input
              placeholder="TXN-2026-000001"
              value={filters.search}
              onChange={(e) => change("search", e.target.value)}
            />
          </Field>
          <Select
            label="Source account"
            value={filters.sourceAccountId}
            onChange={(v) => change("sourceAccountId", v)}
            options={accounts.rows.map((a) => ({
              value: a.accountId,
              label: a.accountNumber,
            }))}
          />
          <Select
            label="Status"
            value={filters.status}
            onChange={(v) => change("status", v)}
            options={["Pending", "Completed", "Rejected"]}
          />
          {[
            ["from", "From date (UTC)"],
            ["to", "To date (UTC)"],
          ].map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                type="date"
                value={filters[key]}
                onChange={(e) => change(key, e.target.value)}
              />
            </Field>
          ))}
        </div>
        <ResourceState resource={resource}>
          {(result) => (
            <>
              <TransactionTable rows={result.data} />
              <Pagination
                pagination={result.pagination}
                onChange={(page) => setFilters((f) => ({ ...f, page }))}
              />
            </>
          )}
        </ResourceState>
      </section>
    </>
  );
}
export function TransactionDetail() {
  const { id } = useParams(),
    resource = useResource("/transactions/" + id);
  return (
    <ResourceState resource={resource}>
      {({ data: t }) => (
        <>
          <Heading
            title={t.referenceNumber}
            description="Historical transfer details"
          />
          <section className="panel">
            <Details
              items={Object.entries({
                Status: <Badge status={t.status} />,
                Amount: money(t.amountMinor, t.currency),
                Currency: t.currency,
                Type: t.transactionType,
                "Source account": (
                  <Link to={"/accounts/" + t.sourceAccountId}>
                    {t.sourceAccount.accountNumber} ·{" "}
                    {t.sourceAccount.companyName}
                  </Link>
                ),
                "Destination account": (
                  <Link to={"/accounts/" + t.destinationAccountId}>
                    {t.destinationAccount.accountNumber} ·{" "}
                    {t.destinationAccount.companyName}
                  </Link>
                ),
                Description: t.description,
                "Transaction ID": t.transactionId,
                "Created (UTC)": t.createdAt,
              })}
            />
          </section>
          <Link to="/transactions">← Back to transaction history</Link>
        </>
      )}
    </ResourceState>
  );
}
