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
}
