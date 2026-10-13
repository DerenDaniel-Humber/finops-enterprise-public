import { useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { useResource } from "../lib/useResource";
import { query } from "../lib/api";
import {
  Heading,
  ResourceState,
  Select,
  Field,
  Badge,
  Pagination,
  Empty,
  AccountTable,
  Details,
} from "../components/Common";
export const industries = [
  "Manufacturing",
  "Construction",
  "Transportation",
  "Technology",
  "Financial Services",
  "Retail",
  "Wholesale Distribution",
];
export const statuses = ["Active", "Inactive", "Suspended"];
export default function Clients() {
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    industry: "",
    page: 1,
  });
  const resource = useResource("/clients" + query(filters));
  const change = (key, value) =>
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  return (
    <>
      <Heading
        title="Corporate clients"
        description="Register organizations and maintain their business profiles."
        action={
          <Link className="button" to="/clients/new">
            + Register client
          </Link>
        }
      />
      <section className="panel">
        <div className="filters">
          <Field label="Search clients">
            <input
              placeholder="Company or registration number"
              value={filters.search}
              onChange={(e) => change("search", e.target.value)}
            />
          </Field>
          <Select
            label="Status"
            value={filters.status}
            onChange={(v) => change("status", v)}
            options={statuses}
          />
          <Select
            label="Industry"
            value={filters.industry}
            onChange={(v) => change("industry", v)}
            options={industries}
          />
        </div>
        <ResourceState resource={resource}>
          {(result) => (
            <>
              {result.data.length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Company / registration</th>
                        <th>Industry</th>
                        <th>Country</th>
                        <th>Status</th>
                        <th>Profile</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.data.map((c) => (
                        <tr key={c.clientId}>
                          <td>
                            <strong>{c.companyName}</strong>
                            <small className="mono">
                              {c.registrationNumber}
                            </small>
                          </td>
                          <td>{c.industry}</td>
                          <td>{c.country}</td>
                          <td>
                            <Badge status={c.status} />
                          </td>
                          <td>
                            <Link to={"/clients/" + c.clientId}>View ↗</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty />
              )}
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
export function ClientDetail() {
  const { id } = useParams(),
    location = useLocation(),
    resource = useResource("/clients/" + id);
  return (
    <ResourceState resource={resource}>
      {({ data: c }) => (
        <>
          {location.state?.message && (
            <div className="notice success" role="status">
              {location.state.message}
            </div>
          )}
          <Heading
            title={c.companyName}
            description="Corporate client profile"
            action={
              <Link className="button" to={"/clients/" + id + "/edit"}>
                Edit client
              </Link>
            }
          />
          <section className="panel">
            <Details
              items={Object.entries({
                Registration: c.registrationNumber,
                Status: <Badge status={c.status} />,
                Industry: c.industry,
                Country: c.country,
                Email: c.contactEmail,
                Phone: c.contactPhone,
                "Client ID": c.clientId,
                "Created (UTC)": c.createdAt,
                "Updated (UTC)": c.updatedAt,
              })}
            />
          </section>
          <section className="panel">
            <div className="section-heading">
              <h2>Financial accounts</h2>
              {c.status === "Active" && (
                <Link
                  className="button secondary"
                  to={"/accounts/new?clientId=" + id}
                >
                  + Open account
                </Link>
              )}
            </div>
            <AccountTable
              rows={c.accounts}
              emptyMessage="This client has no financial accounts yet."
            />
          </section>
          <Link to="/clients">← Back to clients</Link>
        </>
      )}
    </ResourceState>
  );
}
