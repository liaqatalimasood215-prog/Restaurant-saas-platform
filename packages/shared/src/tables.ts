/**
 * Rules for setting up areas and tables (owner, 2026-10-29; MASTER_PROMPT.md §7.1 Tables).
 * The server checks these on every change; screens use them to show mistakes before saving.
 * Roman Urdu: Table ka naam, seats aur tarteeb ke qaide — har screen aur server yahi istemal karte hain.
 */
export const MAX_NAME_LENGTH = 30;
export const MAX_TABLE_SEATS = 50;
/** "Add many tables" creates at most this many at once */
export const MAX_BULK_TABLES = 50;

export type TableSetupProblem =
  | 'NAME_REQUIRED'
  | 'NAME_TOO_LONG'
  /** Another table in the same area (or, for an area name, another area) already has this name */
  | 'NAME_TAKEN'
  | 'SEATS_INVALID'
  | 'RANGE_INVALID'
  | 'TOO_MANY';

/** "  t 1 " → "t 1": trimmed, single spaces. */
export function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/** Names are compared without case and extra spaces: "T1" and " t1" are the same table. */
export function sameName(a: string, b: string): boolean {
  return cleanName(a).toLowerCase() === cleanName(b).toLowerCase();
}

/** Seating capacity is a positive whole number (1–50). */
export function checkSeats(seats: number): TableSetupProblem | null {
  return Number.isInteger(seats) && seats >= 1 && seats <= MAX_TABLE_SEATS ? null : 'SEATS_INVALID';
}

/** A table name must be new inside its area; an area name must be new in the branch. */
export function checkName(name: string, takenNames: readonly string[]): TableSetupProblem | null {
  const clean = cleanName(name);
  if (!clean) return 'NAME_REQUIRED';
  if (clean.length > MAX_NAME_LENGTH) return 'NAME_TOO_LONG';
  if (takenNames.some((n) => sameName(n, clean))) return 'NAME_TAKEN';
  return null;
}

export interface BulkTablesRule {
  /** e.g. "T" → T1, T2 …; may be empty → 1, 2 … */
  prefix: string;
  from: number;
  to: number;
  seats: number;
}

export type BulkTablesCheck = { ok: true; names: string[] } | { ok: false; problem: TableSetupProblem; name?: string };

/** "T", 1 → 10 = T1 … T10, each checked like a single table against the names already in the area. */
export function checkBulkTables(rule: BulkTablesRule, takenNames: readonly string[]): BulkTablesCheck {
  const { from, to } = rule;
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < from) return { ok: false, problem: 'RANGE_INVALID' };
  if (to - from + 1 > MAX_BULK_TABLES) return { ok: false, problem: 'TOO_MANY' };
  const seatsProblem = checkSeats(rule.seats);
  if (seatsProblem) return { ok: false, problem: seatsProblem };
  const prefix = cleanName(rule.prefix);
  const names: string[] = [];
  for (let n = from; n <= to; n++) {
    const name = `${prefix}${n}`;
    const problem = checkName(name, takenNames);
    if (problem) return { ok: false, problem, name };
    names.push(name);
  }
  return { ok: true, names };
}

/** The number after the highest "T<n>" in the area, so "Add many tables" can suggest T17 → T26. */
export function nextTableNumber(prefix: string, names: readonly string[]): number {
  const clean = cleanName(prefix).toLowerCase();
  let highest = 0;
  for (const name of names) {
    const lower = cleanName(name).toLowerCase();
    if (!lower.startsWith(clean)) continue;
    const rest = lower.slice(clean.length);
    if (/^\d+$/.test(rest)) highest = Math.max(highest, Number(rest));
  }
  return highest + 1;
}

/**
 * Display order: moves one record to a 1-based position and numbers the list again 1, 2, 3 …
 * Positions outside the list are clamped (0 → first, 99 → last).
 */
export function placeAt<T extends { id: string; sort: number }>(list: readonly T[], id: string, position: number): T[] {
  const ordered = [...list].sort((a, b) => a.sort - b.sort);
  const from = ordered.findIndex((x) => x.id === id);
  if (from === -1) return ordered;
  const moved = ordered.splice(from, 1)[0] as T;
  const to = Math.min(Math.max(Math.round(position) - 1, 0), ordered.length);
  ordered.splice(to, 0, moved);
  return ordered.map((x, i) => ({ ...x, sort: i + 1 }));
}
