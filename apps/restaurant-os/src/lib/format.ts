/** Display formats (MASTER_PROMPT.md §10.10): 12-hour time; money via formatPaisa from packages/shared. */

export function minutesSince(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000));
}

/** Kitchen timer: "4:07" (minutes:seconds), "1:02:15" after an hour. */
export function timerText(iso: string, now: number): string {
  const total = Math.max(0, Math.floor((now - Date.parse(iso)) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit', hour12: true });
}
