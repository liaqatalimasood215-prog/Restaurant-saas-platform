/**
 * Business day (MASTER_PROMPT.md §6.6): each branch has a day start time (default 06:00), so sales
 * after midnight count for the previous business day. Daily order numbers restart every business day.
 * Roman Urdu: Raat 12 ke baad ki sale pichle din mein ginti hoti hai, jab tak din shuru hone ka waqt na aaye.
 */
export const DEFAULT_TIME_ZONE = 'Asia/Karachi';
export const DEFAULT_BUSINESS_DAY_START = '06:00';

function parseDayStart(dayStart: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(dayStart);
  if (!match) throw new Error('Business day start must look like HH:MM');
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Business date (YYYY-MM-DD) of a moment, in the branch's time zone. */
export function businessDate(
  at: Date,
  timeZone: string = DEFAULT_TIME_ZONE,
  dayStart: string = DEFAULT_BUSINESS_DAY_START,
): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  const localMinutes = part('hour') * 60 + part('minute');
  const day = new Date(Date.UTC(part('year'), part('month') - 1, part('day')));
  if (localMinutes < parseDayStart(dayStart)) day.setUTCDate(day.getUTCDate() - 1);
  return day.toISOString().slice(0, 10);
}
