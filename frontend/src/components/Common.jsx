import { Children, cloneElement, isValidElement } from "react";
import { Link } from "react-router-dom";
import { money } from "../lib/money";
export function Heading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow || "OPERATIONS WORKSPACE"}</div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Badge({ status }) {
  return (
    <span className={"badge " + status.toLowerCase()}>
      <span />
      {status}
    </span>
  );
}
export function ResourceState({ resource, children }) {
  if (resource.loading)
    return (
      <div className="state" role="status">
        <span className="spinner" /> Loading business records…
      </div>
    );
  if (resource.error)
    return (
      <div className="state error" role="alert">
        <h2>Unable to load records</h2>
        <p>{resource.error.message}</p>
        <button onClick={resource.retry}>Try again</button>
      </div>
    );
  return children(resource.data);
}
export function Pagination({ pagination, onChange }) {
  return (
    <div className="pagination">
      <span>
        {pagination.total} records · Page {pagination.page} of{" "}
        {Math.max(1, pagination.totalPages)}
      </span>
      <div>
        <button
          className="secondary"
          disabled={pagination.page <= 1}
          onClick={() => onChange(pagination.page - 1)}
        >
          Previous
        </button>
        <button
          className="secondary"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onChange(pagination.page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
export function Empty({ message = "No records match these filters." }) {
  return (
    <div className="empty">
      <h3>No results found</h3>
      <p>{message}</p>
    </div>
  );
}
export function Field({ label, error, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {Children.map(children, (child) =>
        isValidElement(child) && ["input", "select"].includes(child.type)
          ? cloneElement(child, { "aria-label": label })
          : child,
      )}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}
export function Select({
  label,
  value,
  onChange,
  options,
  placeholder = "All",
  ...props
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => {
          const [value, text] =
            typeof option === "string"
              ? [option, option]
              : [option.value, option.label];
          return (
            <option key={value} value={value}>
              {text}
            </option>
          );
        })}
      </select>
    </Field>
  );
}
export function ErrorMessage({ error }) {
  return error ? (
    <div className="notice error" role="alert">
      {error.message}
    </div>
  ) : null;
}
export function AccountTable({
  rows,
  emptyMessage = "No financial accounts match these filters.",
}) {
  return rows.length ? (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Account number</th>
            <th>Corporate client</th>
            <th>Type</th>
            <th>Recorded balance</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.accountId}>
              <td>
                <Link className="mono" to={"/accounts/" + a.accountId}>
                  {a.accountNumber}
                </Link>
              </td>
              <td>
                <Link to={"/clients/" + a.clientId}>{a.companyName}</Link>
              </td>
              <td>{a.accountType}</td>
              <td className="money">{money(a.balanceMinor, a.currency)}</td>
              <td>
                <Badge status={a.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty message={emptyMessage} />
  );
}
export function TransactionTable({ rows }) {
  return rows.length ? (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Reference / date</th>
            <th>Source → destination</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.transactionId}>
              <td>
                <Link className="mono" to={"/transactions/" + t.transactionId}>
                  {t.referenceNumber}
                </Link>
                <small>
                  {new Date(t.createdAt).toLocaleString("en-CA", {
                    timeZone: "UTC",
                  })}{" "}
                  UTC
                </small>
              </td>
              <td>
                <Link to={"/accounts/" + t.sourceAccountId}>
                  {t.sourceAccount?.accountNumber || t.sourceAccountId}
                </Link>
                <small>
                  →{" "}
                  <Link to={"/accounts/" + t.destinationAccountId}>
                    {t.destinationAccount?.accountNumber ||
                      t.destinationAccountId}
                  </Link>
                </small>
              </td>
              <td className="money">{money(t.amountMinor, t.currency)}</td>
              <td>
                <Badge status={t.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty message="No historical transactions match your search." />
  );
}
export function Details({ items }) {
  return (
    <dl className="details">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
