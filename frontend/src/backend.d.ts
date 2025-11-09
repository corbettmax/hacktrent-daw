// Minimal declaration for backend types used by the frontend while dfx bindings are not generated.
export type Pattern = boolean[][];

export interface SynthPreset {
  name: string;
  settings: {
    oscillators: Array<{ waveform: string; detune: number; volume: number }>;
    envelope: { attack: number; decay: number; sustain: number; release: number };
    filter: { filterType: string; cutoff: number; resonance: number };
    effects: { delayTime: number; delayFeedback: number; reverbAmount: number };
  };
}

