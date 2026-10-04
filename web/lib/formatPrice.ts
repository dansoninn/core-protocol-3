/**
 * Deterministic Icelandic-style price formatting.
 *
 * Deliberately avoids `toLocaleString` / `Intl.NumberFormat`: server and browser
 * ICU data can produce different output for the same locale (Node renders
 * "24.900" for is-IS, some browsers render "24,900"), so formatting must be
 * deterministic.
 *
 * Period as thousands separator, no decimals.
 *   24900 -> "24.900", 1500 -> "1.500", 950 -> "950"
 */
export function formatPrice(value: number): string {
  const digits = String(Math.round(Math.abs(value)));

  let out = "";
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ".";
    out += digits[i];
  }

  return value < 0 ? `-${out}` : out;
}
