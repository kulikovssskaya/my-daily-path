/** Short chimes via Web Audio — no external files. */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export type ChimeKind = "focus_done" | "break_done" | "session_saved";

function tone(
  frequency: number,
  startTime: number,
  duration: number,
  volume: number,
  audio: AudioContext
) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

/** Play a gentle chime. Respects browser autoplay policy (may need user gesture first). */
export function playChime(kind: ChimeKind = "focus_done") {
  const audio = getCtx();
  if (!audio) return;
  void audio.resume();

  const t = audio.currentTime;
  const vol = 0.12;

  if (kind === "focus_done") {
    tone(523.25, t, 0.35, vol, audio);
    tone(659.25, t + 0.12, 0.45, vol, audio);
  } else if (kind === "break_done") {
    tone(440, t, 0.3, vol, audio);
    tone(554.37, t + 0.1, 0.35, vol, audio);
    tone(659.25, t + 0.2, 0.4, vol, audio);
  } else {
    tone(392, t, 0.25, vol * 0.8, audio);
    tone(523.25, t + 0.08, 0.3, vol * 0.8, audio);
  }
}
