export class AudioEngine {
  private audioContext: AudioContext | null = null;

  async initialize() {
    this.audioContext = new AudioContext();
  }

  async generateDrumSound(type: string): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('Audio context not initialized');

    const sampleRate = this.audioContext.sampleRate;
    let duration = 0.5;
    let buffer: AudioBuffer;

    switch (type) {
      case 'kick':
        duration = 0.5;
        buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        this.generateKick(buffer);
        break;
      case 'snare':
        duration = 0.3;
        buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        this.generateSnare(buffer);
        break;
      case 'hihat':
        duration = 0.1;
        buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        this.generateHiHat(buffer);
        break;
      case 'clap':
        duration = 0.2;
        buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        this.generateClap(buffer);
        break;
      default:
        duration = 0.1;
        buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    }

    return buffer;
  }

  private generateKick(buffer: AudioBuffer) {
    const data = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const freq = 150 * Math.exp(-t * 10);
      const envelope = Math.exp(-t * 5);
      data[i] = Math.sin(2 * Math.PI * freq * t) * envelope;
    }
  }

  private generateSnare(buffer: AudioBuffer) {
    const data = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const noise = (Math.random() * 2 - 1) * 0.5;
      const tone = Math.sin(2 * Math.PI * 200 * t) * 0.3;
      const envelope = Math.exp(-t * 15);
      data[i] = (noise + tone) * envelope;
    }
  }

  private generateHiHat(buffer: AudioBuffer) {
    const data = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const noise = Math.random() * 2 - 1;
      const envelope = Math.exp(-t * 40);
      data[i] = noise * envelope * 0.3;
    }
  }

  private generateClap(buffer: AudioBuffer) {
    const data = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const noise = Math.random() * 2 - 1;
      const envelope = Math.exp(-t * 20) * (1 + Math.sin(t * 100) * 0.5);
      data[i] = noise * envelope * 0.4;
    }
  }

  async loadAudioFile(file: File): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('Audio context not initialized');

    const arrayBuffer = await file.arrayBuffer();
    return this.audioContext.decodeAudioData(arrayBuffer);
  }

  playSound(buffer: AudioBuffer, volume: number = 1) {
    if (!this.audioContext) return;

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = buffer;
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    source.start();
  }

  createBuffer(numberOfChannels: number, length: number, sampleRate: number): AudioBuffer | null {
    if (!this.audioContext) return null;
    return this.audioContext.createBuffer(numberOfChannels, length, sampleRate);
  }

  /**
   * Creates an audio sample from AI API response
   * @param apiUrl - The API endpoint to call
   * @param prompt - The prompt to send to the AI (e.g., "create a punchy kick drum")
   * @returns AudioBuffer generated from AI parameters
   */
  async createSampleFromAI(apiUrl: string, prompt: string): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('Audio context not initialized');

    try {
      // Make API call to get audio parameters
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const aiResponse = await response.json();

      // Parse AI response - expected format:
      // {
      //   duration: number (in seconds),
      //   waveform: string ('sine', 'square', 'sawtooth', 'triangle', 'noise'),
      //   frequency: number (in Hz),
      //   envelope: { attack: number, decay: number, sustain: number, release: number },
      //   filters: [{ type: string, frequency: number, q: number }] (optional)
      // }

      const {
        duration = 0.5,
        waveform = 'sine',
        frequency = 440,
        envelope = { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.2 },
        amplitude = 0.5,
        harmonics = [] // array of { frequency: number, amplitude: number }
      } = aiResponse;

      const sampleRate = this.audioContext.sampleRate;
      const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
      const data = buffer.getChannelData(0);

      // Generate audio based on AI parameters
      for (let i = 0; i < buffer.length; i++) {
        const t = i / sampleRate;
        
        // Calculate ADSR envelope
        let envelopeValue = 0;
        const attackTime = envelope.attack;
        const decayTime = envelope.attack + envelope.decay;
        const releaseTime = duration - envelope.release;

        if (t < attackTime) {
          // Attack phase
          envelopeValue = t / attackTime;
        } else if (t < decayTime) {
          // Decay phase
          envelopeValue = 1 - ((t - attackTime) / envelope.decay) * (1 - envelope.sustain);
        } else if (t < releaseTime) {
          // Sustain phase
          envelopeValue = envelope.sustain;
        } else {
          // Release phase
          envelopeValue = envelope.sustain * (1 - (t - releaseTime) / envelope.release);
        }

        // Generate waveform
        let sample = 0;
        
        switch (waveform.toLowerCase()) {
          case 'sine':
            sample = Math.sin(2 * Math.PI * frequency * t);
            break;
          case 'square':
            sample = Math.sign(Math.sin(2 * Math.PI * frequency * t));
            break;
          case 'sawtooth':
            sample = 2 * ((frequency * t) % 1) - 1;
            break;
          case 'triangle':
            sample = 4 * Math.abs(((frequency * t) % 1) - 0.5) - 1;
            break;
          case 'noise':
            sample = Math.random() * 2 - 1;
            break;
          default:
            sample = Math.sin(2 * Math.PI * frequency * t);
        }

        // Add harmonics if provided
        if (harmonics && harmonics.length > 0) {
          for (const harmonic of harmonics) {
            sample += Math.sin(2 * Math.PI * harmonic.frequency * t) * harmonic.amplitude;
          }
        }

        // Apply envelope and amplitude
        data[i] = sample * envelopeValue * amplitude;
      }

      return buffer;

    } catch (error) {
      console.error('Error creating sample from AI:', error);
      throw new Error(`Failed to create sample from AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Helper method to create a sample with a predefined JSON structure (for testing)
   * @param jsonParams - JSON object with audio parameters
   * @returns AudioBuffer generated from parameters
   */
  async createSampleFromJSON(jsonParams: any): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('Audio context not initialized');

    const {
      duration = 0.5,
      waveform = 'sine',
      frequency = 440,
      envelope = { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.2 },
      amplitude = 0.5,
      harmonics = []
    } = jsonParams;

    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      
      // Calculate ADSR envelope
      let envelopeValue = 0;
      const attackTime = envelope.attack;
      const decayTime = envelope.attack + envelope.decay;
      const releaseTime = duration - envelope.release;

      if (t < attackTime) {
        envelopeValue = t / attackTime;
      } else if (t < decayTime) {
        envelopeValue = 1 - ((t - attackTime) / envelope.decay) * (1 - envelope.sustain);
      } else if (t < releaseTime) {
        envelopeValue = envelope.sustain;
      } else {
        envelopeValue = envelope.sustain * (1 - (t - releaseTime) / envelope.release);
      }

      // Generate waveform
      let sample = 0;
      
      switch (waveform.toLowerCase()) {
        case 'sine':
          sample = Math.sin(2 * Math.PI * frequency * t);
          break;
        case 'square':
          sample = Math.sign(Math.sin(2 * Math.PI * frequency * t));
          break;
        case 'sawtooth':
          sample = 2 * ((frequency * t) % 1) - 1;
          break;
        case 'triangle':
          sample = 4 * Math.abs(((frequency * t) % 1) - 0.5) - 1;
          break;
        case 'noise':
          sample = Math.random() * 2 - 1;
          break;
        default:
          sample = Math.sin(2 * Math.PI * frequency * t);
      }

      // Add harmonics if provided
      if (harmonics && harmonics.length > 0) {
        for (const harmonic of harmonics) {
          sample += Math.sin(2 * Math.PI * harmonic.frequency * t) * harmonic.amplitude;
        }
      }

      // Apply envelope and amplitude
      data[i] = sample * envelopeValue * amplitude;
    }

    return buffer;
  }
}
