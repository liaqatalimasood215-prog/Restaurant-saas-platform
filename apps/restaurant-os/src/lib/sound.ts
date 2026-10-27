/**
 * Alert sound and vibration (MASTER_PROMPT.md §10.5, §11). Browsers block sound until the user has
 * tapped the page once, so sound starts working after the first tap (Kitchen shows a button for it).
 * Free: built-in Web Audio, no sound files, no paid service.
 */
let context: AudioContext | null = null;

export function unlockSound(): boolean {
  try {
    context ??= new AudioContext();
    void context.resume();
    return true;
  } catch {
    return false;
  }
}

export function isSoundUnlocked(): boolean {
  return context?.state === 'running';
}

/** Two short beeps. */
export function playAlert(): void {
  if (!context || context.state !== 'running') return;
  const start = context.currentTime;
  for (const offset of [0, 0.25]) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, start + offset);
    gain.gain.exponentialRampToValueAtTime(0.4, start + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.18);
    osc.connect(gain).connect(context.destination);
    osc.start(start + offset);
    osc.stop(start + offset + 0.2);
  }
}

export function vibrate(): void {
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    // not supported
  }
}
