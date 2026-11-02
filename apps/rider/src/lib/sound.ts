/**
 * Alert for a new assignment: sound and vibration (MASTER_PROMPT.md §10.5). Browsers block sound until the rider has
 * tapped the page once. Free: built-in Web Audio, no sound files, no paid service. Web push for a closed app is Phase 7.
 */
let context: AudioContext | null = null;

export function unlockSound(): void {
  try {
    context ??= new AudioContext();
    void context.resume();
  } catch {
    // No sound on this device: the message and vibration still work.
  }
}

export function alertNewDelivery(): void {
  try {
    navigator.vibrate?.([300, 120, 300]);
  } catch {
    // no vibration on this device
  }
  if (!context) return;
  try {
    for (const start of [0, 0.25, 0.5]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'square';
      oscillator.frequency.value = 880;
      gain.gain.value = 0.15;
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(context.currentTime + start);
      oscillator.stop(context.currentTime + start + 0.18);
    }
  } catch {
    // no sound on this device
  }
}

/** Says the alert aloud with the phone's own voice: Urdu or Hindi if it has one, else the Roman Urdu text. */
export function speakNewDelivery(n: number): void {
  try {
    const synth = window.speechSynthesis;
    const voices = synth.getVoices();
    const urdu = voices.find((v) => v.lang.toLowerCase().startsWith('ur'));
    const hindi = voices.find((v) => v.lang.toLowerCase().startsWith('hi'));
    const voice = urdu ?? hindi;
    const utterance = new SpeechSynthesisUtterance(urdu ? `نیا ڈیلیوری آرڈر، نمبر ${n}` : hindi ? `नया डिलीवरी ऑर्डर, नंबर ${n}` : `Naya delivery order, number ${n}`);
    utterance.lang = voice?.lang ?? 'en-IN';
    if (voice) utterance.voice = voice;
    utterance.rate = 0.9;
    synth.cancel();
    synth.speak(utterance);
  } catch {
    // no speech voice on this device
  }
}
