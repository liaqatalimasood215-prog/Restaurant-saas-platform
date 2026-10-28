/**
 * Alert sound and vibration (MASTER_PROMPT.md §10.5, §11). Browsers block sound until the user has
 * tapped the page once, so sound starts working after the first tap (Kitchen shows a button for it).
 * Free: built-in Web Audio and the browser's own speech voice, no sound files, no paid service.
 */
let context: AudioContext | null = null;

export function unlockSound(): boolean {
  primeSpeech();
  try {
    context ??= new AudioContext();
    void context.resume();
    return true;
  } catch {
    return false;
  }
}

/** Browsers also want a tap before they speak: a silent word on the first tap lets later calls speak. */
function primeSpeech(): void {
  try {
    const synth = window.speechSynthesis;
    synth.getVoices();
    const silent = new SpeechSynthesisUtterance(' ');
    silent.volume = 0;
    synth.speak(silent);
  } catch {
    // no speech voice on this device
  }
}

/**
 * Say a short message aloud with the device's own voice: Urdu if the device has an Urdu voice, else
 * Hindi, else the Roman Urdu text with an English voice. Silent when the device cannot speak.
 */
export function speak(text: { roman: string; urdu: string; hindi: string }): void {
  try {
    const synth = window.speechSynthesis;
    const voices = synth.getVoices();
    const urdu = voices.find((v) => v.lang.toLowerCase().startsWith('ur'));
    const hindi = voices.find((v) => v.lang.toLowerCase().startsWith('hi'));
    const voice = urdu ?? hindi;
    const utterance = new SpeechSynthesisUtterance(urdu ? text.urdu : hindi ? text.hindi : text.roman);
    utterance.lang = voice?.lang ?? 'en-IN';
    if (voice) utterance.voice = voice;
    utterance.rate = 0.9;
    synth.cancel();
    synth.speak(utterance);
  } catch {
    // no speech voice on this device
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
