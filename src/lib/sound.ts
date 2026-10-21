/**
 * Tiny Web Audio UI sound engine.
 *
 * Every sound is synthesised at play time, so there are no audio files to ship
 * and no network request before the first click is heard. The palette is a soft
 * pitched "pop": a fast attack, a short downward pitch slide and a quiet noise
 * tick layered on top for crispness.
 */

export type SoundName =
  | "tab"
  | "click"
  | "toggle-on"
  | "toggle-off"
  | "open"
  | "close"
  | "success"
  | "error";

const STORAGE_KEY = "uti_admin_sound";
const MASTER_GAIN = 0.6;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let enabled = true;
let lastPlay = 0;

/* ───────── context ───────── */

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(ctx.destination);
  }
  // Browsers suspend the context until a user gesture; every sound we play is
  // triggered by one, so resuming here is enough.
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function noise(c: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    const len = Math.floor(c.sampleRate * 0.05);
    noiseBuffer = c.createBuffer(1, len, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

/* ───────── voices ───────── */

type PopOpts = {
  /** Starting frequency in Hz. */
  freq: number;
  /** Where the pitch slides to, as a ratio of `freq`. */
  bend?: number;
  /** Total length in seconds. */
  dur?: number;
  gain?: number;
  type?: OscillatorType;
  /** Level of the noise transient layered on the attack. */
  tick?: number;
  /** Delay before the voice starts, in seconds. */
  delay?: number;
};

function pop(c: AudioContext, o: PopOpts) {
  const {
    freq, bend = 0.72, dur = 0.09, gain = 1, type = "sine", tick = 0.5, delay = 0,
  } = o;
  const t = c.currentTime + delay;

  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * bend), t + dur);

  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + 0.003);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  osc.connect(env).connect(master!);
  osc.start(t);
  osc.stop(t + dur + 0.02);

  if (tick > 0) {
    const src = c.createBufferSource();
    src.buffer = noise(c);
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2600;
    bp.Q.value = 0.9;
    const tenv = c.createGain();
    tenv.gain.setValueAtTime(0.0001, t);
    tenv.gain.exponentialRampToValueAtTime(0.09 * tick * gain, t + 0.001);
    tenv.gain.exponentialRampToValueAtTime(0.0001, t + 0.016);
    src.connect(bp).connect(tenv).connect(master!);
    src.start(t);
    src.stop(t + 0.05);
  }
}

/* ───────── palette ───────── */

/** Small pitch drift so repeated clicks never sound mechanical. */
function drift(freq: number, cents = 45) {
  return freq * Math.pow(2, ((Math.random() * 2 - 1) * cents) / 1200);
}

const VOICES: Record<SoundName, (c: AudioContext) => void> = {
  tab: (c) => {
    pop(c, { freq: drift(760), bend: 0.68, dur: 0.1, gain: 0.5, tick: 1 });
    pop(c, { freq: drift(1520), bend: 0.7, dur: 0.055, gain: 0.12, tick: 0 });
  },
  click: (c) => {
    pop(c, { freq: drift(560), bend: 0.7, dur: 0.07, gain: 0.26, tick: 0.6 });
  },
  "toggle-on": (c) => {
    pop(c, { freq: 620, bend: 1.5, dur: 0.08, gain: 0.32, tick: 0.5 });
  },
  "toggle-off": (c) => {
    pop(c, { freq: 620, bend: 0.62, dur: 0.08, gain: 0.32, tick: 0.5 });
  },
  open: (c) => {
    pop(c, { freq: 480, bend: 1.45, dur: 0.11, gain: 0.3, tick: 0.3 });
  },
  close: (c) => {
    pop(c, { freq: 620, bend: 0.58, dur: 0.1, gain: 0.3, tick: 0.3 });
  },
  success: (c) => {
    pop(c, { freq: 784, bend: 1, dur: 0.12, gain: 0.3, tick: 0.2 });
    pop(c, { freq: 1175, bend: 1, dur: 0.16, gain: 0.26, tick: 0, delay: 0.085 });
  },
  error: (c) => {
    pop(c, { freq: 340, bend: 1, dur: 0.11, gain: 0.3, tick: 0.3 });
    pop(c, { freq: 255, bend: 0.94, dur: 0.17, gain: 0.3, tick: 0, delay: 0.095 });
  },
};

/* ───────── public api ───────── */

export function isSoundEnabled() {
  return enabled;
}

export function setSoundEnabled(next: boolean) {
  enabled = next;
  try { localStorage.setItem(STORAGE_KEY, next ? "on" : "off"); } catch {}
  if (next) play("toggle-on");
}

export function loadSoundPreference() {
  try { enabled = localStorage.getItem(STORAGE_KEY) !== "off"; } catch {}
  return enabled;
}

export function play(name: SoundName) {
  if (!enabled) return;
  // Rapid-fire clicks would otherwise stack into a buzz.
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (now - lastPlay < 35) return;
  lastPlay = now;

  const c = audio();
  if (!c || !master) return;
  try { VOICES[name](c); } catch {}
}
