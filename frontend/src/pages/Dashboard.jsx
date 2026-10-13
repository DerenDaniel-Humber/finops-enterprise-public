import { Link } from "react-router-dom";
import { useResource } from "../lib/useResource";
import { Heading, ResourceState, TransactionTable } from "../components/Common";
const labels = {
  totalClients: "Corporate clients",
  activeClients: "Active clients",
  activeAccounts: "Active accounts",
  totalTransactions: "Recorded transactions",
  pendingTransactions: "Pending",
  completedTransactions: "Completed",
  rejectedTransactions: "Rejected",
};
function MetricCard({ label, value, index }) {
  return (
    <article className="metric">
      <span className="metric-index">0{index + 1}</span>
      <p>{label}</p>
      <strong>{value.toLocaleString("en-CA")}</strong>
      <span className="metric-note">Recorded in this workspace</span>
    </article>
  );
}
function StatusChart({ counts }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <div
      className="chart"
      role="img"
      aria-label={Object.entries(counts)
        .map(([status, count]) => `${status}: ${count}`)
        .join(", ")}
    >
      <div className="bar">
        {Object.entries(counts).map(([status, count]) => (
          <div
            key={status}
            className={status.toLowerCase()}
            style={{ width: total ? `${(count / total) * 100}%` : "0%" }}
          />
        ))}
      </div>
      {!total && <p>No transactions recorded.</p>}
      <div className="legend">
        {Object.entries(counts).map(([status, count]) => (
          <div key={status}>
            <span className={"dot " + status.toLowerCase()} />
            <span>{status}</span>
            <strong>{count}</strong>
            <small>{total ? Math.round((count / total) * 100) : 0}%</small>
          </div>
        ))}
      </div>
    </div>
  );
}
export default function Dashboard() {
  const resource = useResource("/dashboard/summary");
  return (
    <>
      <Heading
        eyebrow="NORTHBRIDGE / RELEASE 01"
        title="Operations overview"
        description="A consolidated view of corporate clients, accounts and recorded activity."
        action={
          <Link className="button" to="/clients/new">
            + Register client
          </Link>
        }
      />
      <ResourceState resource={resource}>
        {({ data }) => (
          <>
            <div className="metrics">
              {Object.entries(data.metrics).map(([key, value], index) => (
                <MetricCard
                  key={key}
                  label={labels[key]}
                  value={value}
                  index={index}
                />
              ))}
            </div>
            <section className="panel chart-panel">
              <div className="section-heading">
                <div>
                  <h2>Transaction status</h2>
                  <p>Distribution across all historical records</p>
                </div>
                <span className="subtle">SIMULATED DATA</span>
              </div>
              <StatusChart counts={data.transactionStatus} />
            </section>
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>Recent activity</h2>
                  <p>The five newest recorded transactions</p>
                </div>
                <Link to="/transactions">View history ↗</Link>
              </div>
              <TransactionTable rows={data.recentTransactions} />
            </section>
          </>
        )}
      </ResourceState>
    </>
  );
}
