export function toMinor(value) {
  if (typeof value !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(value.trim()))
    throw new Error(
      "Enter a non-negative amount with at most two decimal places.",
    );
  const [whole, fraction = ""] = value.trim().split(".");
  const result = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (result > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error("The amount exceeds the safe integer range.");
  return Number(result);
}
export function money(minor, currency) {
  const amount = BigInt(minor);
  const integer = amount / 100n,
    fraction = String(amount % 100n).padStart(2, "0");
  return `${currency} ${integer.toLocaleString("en-CA")}.${fraction}`;
}
