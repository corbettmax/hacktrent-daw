export interface SynthSettings {
  oscillators: Array<{
    waveform: string;
    detune: number;
    volume: number;
  }>;
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  filter: {
    filterType: string;
    cutoff: number;
    resonance: number;
  };
  effects: {
    delayTime: number;
    delayFeedback: number;
    reverbAmount: number;
  };
}

export class SynthEngine {
  private audioContext: AudioContext | null = null;
  private oscillators: OscillatorNode[] = [];
  private gainNodes: GainNode[] = [];
  private masterGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private delay: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayWet: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private reverbWet: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private settings: SynthSettings | null = null;
  private isPlaying = false;

  async initialize() {
    this.audioContext = new AudioContext();
    
    // Create master gain
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.3;

    // Create filter
    this.filter = this.audioContext.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 2000;
    this.filter.Q.value = 1;

    // Create delay effect
    this.delay = this.audioContext.createDelay();
    this.delay.delayTime.value = 0.3;
    this.delayFeedback = this.audioContext.createGain();
    this.delayFeedback.gain.value = 0.3;
    this.delayWet = this.audioContext.createGain();
    this.delayWet.gain.value = 0.3;

    // Connect delay
    this.delay.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delay);
    this.delay.connect(this.delayWet);

    // Create reverb (simple convolver)
    this.convolver = this.audioContext.createConvolver();
    this.convolver.buffer = this.createReverbImpulse();
    this.reverbWet = this.audioContext.createGain();
    this.reverbWet.gain.value = 0.2;
    this.convolver.connect(this.reverbWet);

    // Create analyser for waveform display
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;

    // Connect chain: filter -> delay -> reverb -> analyser -> master -> destination
    this.filter.connect(this.delay);
    this.filter.connect(this.convolver);
    this.filter.connect(this.analyser);
    this.delayWet.connect(this.analyser);
    this.reverbWet.connect(this.analyser);
    this.analyser.connect(this.masterGain);
    this.masterGain.connect(this.audioContext.destination);
  }

  private createReverbImpulse(): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized');
    
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * 2;
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }
    
    return impulse;
  }

  updateSettings(settings: SynthSettings) {
    this.settings = settings;

    if (this.filter) {
      this.filter.type = settings.filter.filterType as BiquadFilterType;
      this.filter.frequency.value = settings.filter.cutoff;
      this.filter.Q.value = settings.filter.resonance;
    }

    if (this.delay) {
      this.delay.delayTime.value = settings.effects.delayTime;
    }

    if (this.delayFeedback) {
      this.delayFeedback.gain.value = settings.effects.delayFeedback;
    }

    if (this.reverbWet) {
      this.reverbWet.gain.value = settings.effects.reverbAmount;
    }
  }

  noteOn(frequency: number) {
    if (!this.audioContext || !this.settings || !this.filter) return;

    // Stop any existing notes
    this.noteOff();

    const now = this.audioContext.currentTime;
    const { attack, decay, sustain } = this.settings.envelope;

    // Create oscillators and gain nodes
    this.settings.oscillators.forEach((oscSettings, index) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = oscSettings.waveform as OscillatorType;
      osc.frequency.value = frequency;
      osc.detune.value = oscSettings.detune;

      // ADSR envelope
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(oscSettings.volume, now + attack);
      gain.gain.linearRampToValueAtTime(oscSettings.volume * sustain, now + attack + decay);

      osc.connect(gain);
      gain.connect(this.filter!);
      osc.start(now);

      this.oscillators.push(osc);
      this.gainNodes.push(gain);
    });

    this.isPlaying = true;
  }

  noteOff() {
    if (!this.audioContext || !this.settings) return;

    const now = this.audioContext.currentTime;
    const { release } = this.settings.envelope;

    this.gainNodes.forEach((gain) => {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + release);
    });

    // Stop and clean up oscillators after release
    setTimeout(() => {
      this.oscillators.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (e) {
          // Ignore errors if already stopped
        }
      });
      this.gainNodes.forEach((gain) => gain.disconnect());
      this.oscillators = [];
      this.gainNodes = [];
      this.isPlaying = false;
    }, release * 1000 + 100);
  }

  getWaveformData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0);
    
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteTimeDomainData(dataArray);
    return dataArray;
  }

  dispose() {
    this.noteOff();
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
