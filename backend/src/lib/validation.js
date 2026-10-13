import { bad } from "./errors.js";
export const industries = [
  "Manufacturing",
  "Construction",
  "Transportation",
  "Technology",
  "Financial Services",
  "Retail",
  "Wholesale Distribution",
];
export const countries = ["Canada", "United States"];
export const clientStatuses = ["Active", "Inactive", "Suspended"];
export const accountTypes = ["Operating", "Savings", "Investment"];
export const currencies = ["CAD", "USD"];
export const accountStatuses = ["Active", "Frozen", "Closed"];
export const transactionStatuses = ["Pending", "Completed", "Rejected"];
export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function object(body) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw bad("A JSON object is required.");
}
export function allowed(body, keys) {
  object(body);
  const extras = Object.keys(body).filter((k) => !keys.includes(k));
  if (extras.length)
    throw bad(
      "Unknown or immutable fields.",
      Object.fromEntries(extras.map((k) => [k, "This field is not editable."])),
    );
}
export function text(value, field, min, max) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    throw bad(`Invalid ${field}.`, {
      [field]: `Enter ${min}–${max} characters.`,
    });
  return value.trim();
}
export function choice(value, field, options) {
  if (!options.includes(value))
    throw bad(`Unsupported ${field}.`, {
      [field]: `Choose one of: ${options.join(", ")}.`,
    });
  return value;
}
export function uuid(value, field) {
  if (typeof value !== "string" || !uuidPattern.test(value))
    throw bad(`Invalid ${field}.`, { [field]: "A valid UUID is required." });
  return value;
}
export function clientInput(body, editing = false) {
  const keys = [
    "companyName",
    "industry",
    "country",
    "contactEmail",
    "contactPhone",
    ...(editing ? ["status"] : ["registrationNumber"]),
  ];
  allowed(body, keys);
  if (editing && Object.keys(body).length === 0)
    throw bad("Provide at least one editable field.");
  const result = {};
  const required = (key, fn) => {
    if (!editing || Object.hasOwn(body, key)) result[key] = fn(body[key]);
  };
  required("companyName", (v) => text(v, "companyName", 2, 150));
  if (!editing)
    result.registrationNumber = text(
      body.registrationNumber,
      "registrationNumber",
      5,
      30,
    );
  required("industry", (v) => choice(v, "industry", industries));
  required("country", (v) => choice(v, "country", countries));
  required("contactEmail", (v) => {
    const s = text(v, "contactEmail", 3, 254);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))
      throw bad("Invalid contact email.", {
        contactEmail: "Enter a valid email address.",
      });
    return s;
  });
  if (Object.hasOwn(body, "contactPhone"))
    result.contactPhone = text(body.contactPhone, "contactPhone", 0, 30);
  if (editing && Object.hasOwn(body, "status"))
    result.status = choice(body.status, "status", clientStatuses);
  return result;
}
export function minor(value, field = "balanceMinor", positive = false) {
  if (!Number.isSafeInteger(value) || value < (positive ? 1 : 0))
    throw bad("Invalid monetary amount.", {
      [field]: `Use a ${positive ? "positive" : "non-negative"} safe integer in minor units.`,
    });
  return value;
}
export function pagination(q) {
  const integer = (v, d, max, k) => {
    if (v === undefined) return d;
    if (
      typeof v !== "string" ||
      !/^\d+$/.test(v) ||
      !Number.isSafeInteger(Number(v)) ||
      Number(v) < 1 ||
      Number(v) > max
    )
      throw bad(`Invalid ${k}.`, { [k]: `Use an integer from 1 to ${max}.` });
    return Number(v);
  };
  return {
    page: integer(q.page, 1, 1000000000, "page"),
    pageSize: integer(q.pageSize, 10, 100, "pageSize"),
  };
}
export function paginate(rows, q) {
  const { page, pageSize } = pagination(q);
  return {
    data: rows.slice((page - 1) * pageSize, page * pageSize),
    pagination: {
      page,
      pageSize,
      total: rows.length,
      totalPages: Math.ceil(rows.length / pageSize),
    },
  };
}
export function filters(q, defs) {
  for (const [key, options] of Object.entries(defs))
    if (q[key] !== undefined) {
      if (options === "uuid") uuid(q[key], key);
      else choice(q[key], key, options);
    }
}
export function search(q) {
  if (q.search !== undefined && typeof q.search !== "string")
    throw bad("Invalid search.");
  return (q.search || "").trim().toLowerCase();
}
export function date(value, field) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw bad(`Invalid ${field}.`, { [field]: "Use YYYY-MM-DD." });
  const parsed = new Date(value + "T00:00:00.000Z");
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  )
    throw bad(`Invalid ${field}.`);
  return value;
}
export function dateRange(q) {
  const from = date(q.from, "from"),
    to = date(q.to, "to");
  if (from && to && from > to)
    throw bad("The start date must not follow the end date.", {
      to: "Choose a date on or after the start date.",
    });
  return { from, to };
}
export const newest = (a, b) =>
  b.createdAt.localeCompare(a.createdAt) ||
  a.transactionId.localeCompare(b.transactionId);
