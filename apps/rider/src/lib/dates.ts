/** A day as "2026-11-01", on this phone's calendar. */
export function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function daysAgoKey(days: number, from = new Date()): string {
  return dateKey(new Date(from.getFullYear(), from.getMonth(), from.getDate() - days));
}

/** "2026-11-01" → "Sun, 1 Nov 2026" */
export function dateLabel(key: string): string {
  const [year = 0, month = 1, day = 1] = key.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
