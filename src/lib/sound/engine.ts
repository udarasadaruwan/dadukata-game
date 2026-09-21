/**
 * Lightweight synthesized sound engine using Web Audio API.
 * All sounds are generated programmatically — zero audio files needed.
 */

type SoundName =
  | "diceRoll"
  | "diceLand"
  | "pawnHop"
  | "ladderClimb"
  | "snakeSlide"
  | "turnDing"
  | "winJingle";

const MUTE_KEY = "dathukata-muted";

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean;

  constructor() {
    this.muted =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(MUTE_KEY) === "true"
        : false;
  }

  /** Lazily initialize AudioContext on first user gesture */
  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  setMuted(val: boolean): void {
    this.muted = val;
    try {
      localStorage.setItem(MUTE_KEY, String(val));
    } catch {
      // localStorage might not be available
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  play(name: SoundName): void {
    if (this.muted) return;
    try {
      const ctx = this.ensureContext();
      switch (name) {
        case "diceRoll":
          this.playDiceRoll(ctx);
          break;
        case "diceLand":
          this.playDiceLand(ctx);
          break;
        case "pawnHop":
          this.playPawnHop(ctx);
          break;
        case "ladderClimb":
          this.playLadderClimb(ctx);
          break;
        case "snakeSlide":
          this.playSnakeSlide(ctx);
          break;
        case "turnDing":
          this.playTurnDing(ctx);
          break;
        case "winJingle":
          this.playWinJingle(ctx);
          break;
      }
    } catch {
      // Silently fail if audio isn't available
    }
  }

  /** Rolling/rattling sound — filtered noise burst with tremolo */
  private playDiceRoll(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const duration = 0.6;

    // Create noise via buffer
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Bandpass filter for a rattly tone
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.linearRampToValueAtTime(400, now + duration);
    filter.Q.value = 2;

    // Tremolo for rattle effect
    const tremoloGain = ctx.createGain();
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 18;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.3;
    lfo.connect(lfoGain);
    lfoGain.connect(tremoloGain.gain);

    // Master gain
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.linearRampToValueAtTime(0.06, now + duration * 0.7);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    noise.connect(filter);
    filter.connect(tremoloGain);
    tremoloGain.connect(gain);
    gain.connect(ctx.destination);

    lfo.start(now);
    noise.start(now);
    noise.stop(now + duration);
    lfo.stop(now + duration);
  }

  /** Short percussive thunk */
  private playDiceLand(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  /** Quick tick per square */
  private playPawnHop(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 660;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  /** Rising three-note arpeggio */
  private playLadderClimb(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      const start = now + i * 0.1;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.15);
    });
  }

  /** Descending frequency sweep */
  private playSnakeSlide(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.35);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1200;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  /** Clear bell ding */
  private playTurnDing(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 880;

    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = 1320; // harmonic

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.04, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
    osc2.start(now);
    osc2.stop(now + 0.3);
  }

  /** Short celebratory major chord arpeggio */
  private playWinJingle(ctx: AudioContext): void {
    const now = ctx.currentTime;
    // C major arpeggio + octave: C E G C E
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      const start = now + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
      gain.gain.setValueAtTime(0.15, start + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  }
}

/** Singleton instance */
export const soundEngine = new SoundEngine();
export type { SoundName };
