import { useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { useResource } from "../lib/useResource";
import {
  Heading,
  Field,
  ResourceState,
  ErrorMessage,
} from "../components/Common";
import { industries, statuses } from "./Clients";
function Form({ client }) {
  const editing = !!client,
    navigate = useNavigate();
  const [values, setValues] = useState(
    client
      ? Object.fromEntries(
          [
            "companyName",
            "industry",
            "country",
            "contactEmail",
            "contactPhone",
            "status",
          ].map((k) => [k, client[k]]),
        )
      : {
          companyName: "",
          registrationNumber: "",
          industry: "",
          country: "",
          contactEmail: "",
          contactPhone: "",
        },
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(null);
  const pending = useRef(false);
  const change = (key, value) => setValues((v) => ({ ...v, [key]: value }));
  async function submit(e) {
    e.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      const { data } = await api(
        editing ? "/clients/" + client.clientId : "/clients",
        { method: editing ? "PATCH" : "POST", body: JSON.stringify(values) },
      );
      navigate("/clients/" + data.clientId, {
        state: {
          message: editing
            ? "Client information updated successfully."
            : "Corporate client registered successfully.",
        },
      });
    } catch (error) {
      setError(error);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const input = (key, label, type, min, max) => (
    <Field key={key} label={label} error={error?.fields?.[key]}>
      <input
        name={key}
        type={type || "text"}
        required={key !== "contactPhone"}
        minLength={min}
        maxLength={max}
        value={values[key] || ""}
        onChange={(e) => change(key, e.target.value)}
      />
    </Field>
  );
  const select = (key, label, options) => (
    <Field key={key} label={label} error={error?.fields?.[key]}>
      <select
        name={key}
        required
        value={values[key]}
        onChange={(e) => change(key, e.target.value)}
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
    </Field>
  );
  return (
    <>
      <Heading
        title={editing ? "Edit corporate client" : "Register corporate client"}
        description={
          editing
            ? "Maintain business information. Registration and client identifiers are immutable."
            : "Create a new business profile in the central client registry."
        }
      />
      <form className="panel form-panel" onSubmit={submit}>
        <ErrorMessage error={error} />
        <fieldset disabled={busy}>
          <div className="form-grid">
            {input("companyName", "Company name", "text", 2, 150)}
            {!editing ? (
              input("registrationNumber", "Registration number", "text", 5, 30)
            ) : (
              <Field label="Registration number (immutable)">
                <input value={client.registrationNumber} readOnly />
              </Field>
            )}
            {select("industry", "Industry", industries)}
            {select("country", "Country", ["Canada", "United States"])}
            {input("contactEmail", "Contact email", "email", 3, 254)}
            {input("contactPhone", "Contact phone (optional)", "tel", 0, 30)}
            {editing && select("status", "Status", statuses)}
          </div>
          <div className="form-actions">
            <Link to={editing ? "/clients/" + client.clientId : "/clients"}>
              Cancel
            </Link>
            <button type="submit">
              {busy ? "Saving…" : editing ? "Save changes" : "Register client"}
            </button>
          </div>
        </fieldset>
      </form>
    </>
  );
}
export default function ClientForm() {
  const { id } = useParams();
  return id ? <Edit id={id} /> : <Form />;
}
function Edit({ id }) {
  const resource = useResource("/clients/" + id);
  return (
    <ResourceState resource={resource}>
      {({ data }) => <Form key={data.clientId} client={data} />}
    </ResourceState>
  );
}
