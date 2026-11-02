/**
 * The customer hears each step of their order. Browsers block sound until the first tap on the page. Free: built-in Web Audio
 * and the browser's own voice, no sound files and no paid service.
 */
let context: AudioContext | null = null;

if (typeof window !== 'undefined') {
  document.addEventListener(
    'pointerdown',
    () => {
      try {
        context ??= new AudioContext();
        void context.resume();
      } catch {
        // No sound on this device.
      }
    },
    { once: true },
  );
}

function chime(): void {
  if (!context || context.state !== 'running') return;
  const start = context.currentTime;
  for (const [frequency, offset] of [[659, 0], [988, 0.18]] as const) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start + offset);
    gain.gain.exponentialRampToValueAtTime(0.3, start + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.3);
    osc.connect(gain).connect(context.destination);
    osc.start(start + offset);
    osc.stop(start + offset + 0.32);
  }
}

export function announce(text: { roman: string; urdu: string; hindi: string }): void {
  chime();
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
