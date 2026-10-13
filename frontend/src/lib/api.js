const base = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1"
).replace(/\/$/, "");
export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(base + path, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error(
      "Cannot reach the FinOps API. Check that the backend is running.",
    );
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(
      payload?.error?.message || `Request failed (${response.status}).`,
    );
    error.fields = payload?.error?.fields;
    throw error;
  }
  if (!payload) throw new Error("The API returned an invalid response.");
  return payload;
}
export const query = (values) =>
  "?" +
  new URLSearchParams(
    Object.entries(values).filter(
      ([, v]) => v !== "" && v !== undefined && v !== null,
    ),
  ).toString();
export async function all(path, signal) {
  let rows = [],
    page = 1;
  while (true) {
    const result = await api(path + query({ page, pageSize: 100 }), { signal });
    rows = rows.concat(result.data);
    if (page >= result.pagination.totalPages) return rows;
    page++;
  }
}
