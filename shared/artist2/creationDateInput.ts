/**
 * Creation date typing rules for Artist 2 Song Overview.
 * Digits and `/` only. Day and/or month may be omitted:
 *   YYYY | MM/YYYY | DD/MM/YYYY
 */

/** Strip non-digits/slashes and clamp segment lengths toward DD/MM/YYYY. */
export function sanitizeCreationDateInput(raw: string): string {
  const cleaned = raw.replace(/[^\d/]/g, '');
  if (!cleaned) return '';

  const parts = cleaned.split('/');

  // No slash yet — year-only (or leading day digits before the user types `/`).
  if (parts.length === 1) {
    return parts[0].slice(0, 4);
  }

  // One slash — MM/YYYY (month then year) or DD/MM while still typing the month.
  if (parts.length === 2) {
    const first = parts[0].slice(0, 2);
    const second = parts[1];
    if (second.length > 2) {
      // Treat as month/year once the second segment looks like a year.
      return `${first}/${second.slice(0, 4)}`;
    }
    return `${first}/${second.slice(0, 2)}`;
  }

  // Two or more slashes — DD/MM/YYYY (extra slashes collapsed into the year digits).
  const day = parts[0].slice(0, 2);
  const month = parts[1].slice(0, 2);
  const year = parts.slice(2).join('').replace(/\D/g, '').slice(0, 4);
  return `${day}/${month}/${year}`;
}

/** Today's date as DD/MM/YYYY. */
export function todayDdMmYyyy(now = new Date()): string {
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${now.getFullYear()}`;
}

/** Today's date as MM/DD/YYYY (US style) — used for link “Date added” stamps. */
export function todayMmDdYyyy(now = new Date()): string {
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${mm}/${dd}/${now.getFullYear()}`;
}

/** BPM: integers 0–1999 (world record ~1015; leave headroom). */
export const BPM_MAX = 1999;

export function sanitizeBpmInput(raw: string): number | null {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(BPM_MAX, n));
}
