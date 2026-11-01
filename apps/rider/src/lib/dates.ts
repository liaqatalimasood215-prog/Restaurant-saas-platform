import { businessDate } from '@restaurant-saas/shared';

/**
 * The rider's day is the restaurant's business day (MASTER_PROMPT.md §6.6), so deliveries after midnight stay on the same
 * day until the day starts again. It uses the default time zone and start time: the branch's own come with the backend.
 */
export const riderDay = (at: Date): string => businessDate(at);

/** The business day this many days before today, as "2026-11-01". */
export function daysAgoKey(days: number, from = new Date()): string {
  const day = new Date(`${riderDay(from)}T00:00:00.000Z`);
  day.setUTCDate(day.getUTCDate() - days);
  return day.toISOString().slice(0, 10);
}

/** "2026-11-01" → "Sun, 1 Nov 2026" */
export function dateLabel(key: string): string {
  const [year = 0, month = 1, day = 1] = key.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
