export type ChimeKind = "open" | "close" | "paste" | "talk" | "release";

export type ChimeTone = {
  frequencyHz: number;
  durationMs: number;
  gain: number;
};

const TONES: Record<ChimeKind, ChimeTone> = {
  open: { frequencyHz: 880, durationMs: 70, gain: 0.08 },
  talk: { frequencyHz: 988, durationMs: 55, gain: 0.07 },
  release: { frequencyHz: 740, durationMs: 55, gain: 0.07 },
  paste: { frequencyHz: 1174, durationMs: 80, gain: 0.08 },
  close: { frequencyHz: 660, durationMs: 90, gain: 0.08 },
};

export function chimeTone(kind: ChimeKind): ChimeTone {
  return TONES[kind];
}

export type ChimeAudioContext = {
  currentTime: number;
  createOscillator(): {
    type: string;
    frequency: { setValueAtTime(value: number, time: number): void };
    connect(node: unknown): void;
    start(time: number): void;
    stop(time: number): void;
  };
  createGain(): {
    gain: {
      setValueAtTime(value: number, time: number): void;
      exponentialRampToValueAtTime(value: number, time: number): void;
    };
    connect(destination: unknown): void;
  };
  destination: unknown;
};

export function playChimeTone(
  context: ChimeAudioContext,
  kind: ChimeKind,
  now = context.currentTime,
) {
  const tone = chimeTone(kind);
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(tone.frequencyHz, now);
  gain.gain.setValueAtTime(tone.gain, now);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    now + tone.durationMs / 1000,
  );
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + tone.durationMs / 1000 + 0.02);
}
