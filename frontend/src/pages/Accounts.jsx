import { useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import { api, all, query } from "../lib/api";
import { useResource } from "../lib/useResource";
import { money, toMinor } from "../lib/money";
import {
  Heading,
  ResourceState,
  Field,
  Select,
  Pagination,
  AccountTable,
  Details,
  Badge,
  ErrorMessage,
} from "../components/Common";
export function useOptions(path) {
  const [state, setState] = useState({ rows: [], loading: true, error: null });
  useEffect(() => {
    const controller = new AbortController();
    all(path, controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted)
          setState({ rows, loading: false, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ rows: [], loading: false, error });
      });
    return () => controller.abort();
  }, [path]);
  return state;
}
export default function Accounts() {
  const [filters, setFilters] = useState({
    clientId: "",
    accountType: "",
    currency: "",
    status: "",
    page: 1,
  });
  const clients = useOptions("/clients"),
    resource = useResource("/accounts" + query(filters));
  const change = (key, value) =>
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  return (
    <>
      <Heading
        title="Financial accounts"
        description="Review account ownership, currencies and recorded balances."
        action={
          <Link className="button" to="/accounts/new">
            + Open account
          </Link>
        }
      />
      <section className="panel">
        <ErrorMessage error={clients.error} />
        <div className="filters">
          <Select
            label="Corporate client"
            value={filters.clientId}
            onChange={(v) => change("clientId", v)}
            options={clients.rows.map((c) => ({
              value: c.clientId,
              label: c.companyName,
            }))}
          />
          {[
            ["accountType", "Type", ["Operating", "Savings", "Investment"]],
            ["currency", "Currency", ["CAD", "USD"]],
            ["status", "Status", ["Active", "Frozen", "Closed"]],
          ].map(([key, label, options]) => (
            <Select
              key={key}
              label={label}
              value={filters[key]}
              onChange={(v) => change(key, v)}
              options={options}
            />
          ))}
        </div>
        <ResourceState resource={resource}>
          {(result) => (
            <>
              <AccountTable rows={result.data} />
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
export function AccountDetail() {
  const { id } = useParams(),
    location = useLocation(),
    resource = useResource("/accounts/" + id);
  return (
    <ResourceState resource={resource}>
      {({ data: a }) => (
        <>
          {location.state?.message && (
            <div className="notice success" role="status">
              {location.state.message}
            </div>
          )}
          <Heading
            title={a.accountNumber}
            description="Financial account profile"
            action={
              <Link className="button" to={"/transactions?accountId=" + id}>
                Transaction history ↗
              </Link>
            }
          />
          <section className="panel">
            <Details
              items={Object.entries({
                "Corporate client": (
                  <Link to={"/clients/" + a.clientId}>
                    {a.client.companyName}
                  </Link>
                ),
                "Account type": a.accountType,
                Currency: a.currency,
                "Recorded balance": money(a.balanceMinor, a.currency),
                Status: <Badge status={a.status} />,
                "Account ID": a.accountId,
                "Created (UTC)": a.createdAt,
              })}
            />
            <p className="footnote">
              Historical transactions are separate demonstration records.
              Retrieving them does not change this balance.
            </p>
          </section>
          <Link to="/accounts">← Back to accounts</Link>
        </>
      )}
    </ResourceState>
  );
}
export function AccountForm() {
  const clients = useOptions("/clients"),
    [params] = useSearchParams(),
    navigate = useNavigate();
  const [values, setValues] = useState({
    clientId: params.get("clientId") || "",
    accountType: "",
    currency: "",
    openingBalance: "",
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(null),
    pending = useRef(false);
  const selected = clients.rows.find((c) => c.clientId === values.clientId);
  const change = (key, value) => setValues((v) => ({ ...v, [key]: value }));
  async function submit(e) {
    e.preventDefault();
    if (pending.current) return;
    setError(null);
    let balanceMinor;
    try {
      balanceMinor = toMinor(values.openingBalance);
    } catch (error) {
      error.fields = { balanceMinor: error.message };
      setError(error);
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      const { openingBalance, ...body } = values;
      const { data } = await api("/accounts", {
        method: "POST",
        body: JSON.stringify({ ...body, balanceMinor }),
      });
      navigate("/accounts/" + data.accountId, {
        state: { message: "Financial account opened successfully." },
      });
    } catch (error) {
      setError(error);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        title="Open financial account"
        description="Register an account for an active corporate client."
      />
      <form className="panel form-panel" onSubmit={submit}>
        <ErrorMessage error={clients.error || error} />
        <fieldset disabled={busy || clients.loading || !!clients.error}>
          <div className="form-grid">
            <Field label="Corporate client" error={error?.fields?.clientId}>
              <select
                required
                value={values.clientId}
                onChange={(e) => change("clientId", e.target.value)}
              >
                <option value="">Select corporate client</option>
                {clients.rows.map((c) => (
                  <option key={c.clientId} value={c.clientId}>
                    {c.companyName} — {c.status}
                  </option>
                ))}
              </select>
            </Field>
            {selected && (
              <div className="client-selection">
                <strong>{selected.companyName}</strong>
                <Badge status={selected.status} />
                {selected.status !== "Active" && (
                  <p>New accounts require an active client.</p>
                )}
              </div>
            )}
            {[
              [
                "accountType",
                "Account type",
                ["Operating", "Savings", "Investment"],
              ],
              ["currency", "Currency", ["CAD", "USD"]],
            ].map(([key, label, options]) => (
              <Select
                key={key}
                label={label}
                value={values[key]}
                onChange={(v) => change(key, v)}
                options={options}
                placeholder="Select"
                required
              />
            ))}
            <Field label="Opening balance" error={error?.fields?.balanceMinor}>
              <input
                name="openingBalance"
                inputMode="decimal"
                placeholder="12500.75"
                required
                pattern="[0-9]+(\.[0-9]{1,2})?"
                value={values.openingBalance}
                onChange={(e) => change("openingBalance", e.target.value)}
              />
              <small>
                Up to two decimal places. Stored as integer minor units.
              </small>
            </Field>
          </div>
          <div className="form-actions">
            <Link to="/accounts">Cancel</Link>
            <button
              type="submit"
              disabled={!selected || selected.status !== "Active"}
            >
              {busy ? "Opening…" : "Open account"}
            </button>
          </div>
        </fieldset>
      </form>
    </>
  );
}
