// Deterministic Icelandic dates. Never toLocaleDateString / Intl: server and
// browser ICU data can differ (the same reason as lib/formatPrice.ts), which
// gives hydration mismatches and, in one place, en-GB output.
//
// Dates are read in UTC. Iceland is UTC+0 all year with no daylight saving
// (Atlantic/Reykjavik), so UTC fields are the local calendar date.

const MONTHS = [
  "janúar", "febrúar", "mars", "apríl", "maí", "júní",
  "júlí", "ágúst", "september", "október", "nóvember", "desember",
];

const MONTHS_SHORT = [
  "jan.", "feb.", "mar.", "apr.", "maí", "jún.",
  "júl.", "ágú.", "sep.", "okt.", "nóv.", "des.",
];

/** Index 0 = Sunday, as Date.getUTCDay(). */
const WEEKDAYS = [
  "sunnudagur", "mánudagur", "þriðjudagur", "miðvikudagur",
  "fimmtudagur", "föstudagur", "laugardagur",
];

type DateInput = Date | string | number;

function toDate(input: DateInput): Date | null {
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "Þriðjudagur, 6. október" */
export function formatWeekdayDate(input: DateInput): string {
  const d = toDate(input);
  if (!d) return "";
  const weekday = WEEKDAYS[d.getUTCDay()];
  return `${weekday[0].toUpperCase()}${weekday.slice(1)}, ${d.getUTCDate()}. ${MONTHS[d.getUTCMonth()]}`;
}

/** "6. okt." */
export function formatShortDate(input: DateInput): string {
  const d = toDate(input);
  if (!d) return "";
  return `${d.getUTCDate()}. ${MONTHS_SHORT[d.getUTCMonth()]}`;
}

/** "október 2026" */
export function formatMonthYear(input: DateInput): string {
  const d = toDate(input);
  if (!d) return "";
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "6.10.2026" */
export function formatNumericDate(input: DateInput): string {
  const d = toDate(input);
  if (!d) return "";
  return `${d.getUTCDate()}.${d.getUTCMonth() + 1}.${d.getUTCFullYear()}`;
}
