export class SoundSynth {
  private static ctx: AudioContext | null = null;
  private static isMuted: boolean = false;

  static {
    try {
      this.isMuted = localStorage.getItem('snoodrop_audio_muted') === '1';
    } catch (e) {
      this.isMuted = false;
    }
  }

  static toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('snoodrop_audio_muted', this.isMuted ? '1' : '0');
    } catch (e) {
      // Ignore localStorage errors
    }
    return this.isMuted;
  }

  static getMuteState(): boolean {
    return this.isMuted;
  }

  private static initContext() {
    if (!this.ctx) {
      if (window.AudioContext) {
        this.ctx = new window.AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(err => console.warn('AudioContext resume failed:', err));
    }
    return this.ctx;
  }

  static playDrop() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Realistic Water Drop: Sine wave with a quick upward pitch envelope
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);

    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  static playMerge(tier: number) {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    
    // Base elemental sounds depending on the item tier
    // Helper function to create white noise
    const createNoise = (duration: number) => {
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      return noise;
    };

    if (tier <= 3) {
      // Realistic Stone/Rock hit: Short noise burst through lowpass + deep sine thump
      const duration = 0.15;
      const noise = createNoise(duration);
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800 - tier * 100, now);
      filter.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.8, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
      
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);

      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120 - tier * 10, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + duration);
      
      oscGain.gain.setValueAtTime(0.7, now);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
      
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);

    } else if (tier <= 6) {
      // Fire/Plasma Whoosh: Modulated bandpass noise
      const duration = 0.4;
      const noise = createNoise(duration);
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 1.5;
      filter.frequency.setValueAtTime(2000, now);
      filter.frequency.exponentialRampToValueAtTime(200, now + duration);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0, now);
      gain.gain.linearRampToValueAtTime(0.8, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);

    } else if (tier <= 9) {
      // Realistic Crystal/Glass Chime: Pure sine waves fading out slowly
      const duration = 1.2;
      const baseFreq = 1200 + ((tier - 6) * 200);
      
      [1.0, 2.76, 5.4, 8.9].forEach((mult) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * mult, now);
        
        gain.gain.setValueAtTime(0.0, now);
        gain.gain.linearRampToValueAtTime(0.15 / mult, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + duration);
      });

    } else {
      // Cosmic/Magical Resonance
      const duration = 1.8;
      const baseFreq = 150 + ((tier - 9) * 40);
      
      // Ethereal pad
      [0.5, 1.0, 1.5, 2.0].forEach((mult) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * mult, now);
        
        gain.gain.setValueAtTime(0.0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.2); 
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + duration);
      });
      
      // Bass drop
      const bass = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bass.type = 'sine';
      bass.frequency.setValueAtTime(100, now);
      bass.frequency.exponentialRampToValueAtTime(20, now + duration);
      bassGain.gain.setValueAtTime(0.0, now);
      bassGain.gain.linearRampToValueAtTime(0.4, now + 0.05);
      bassGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
      bass.connect(bassGain);
      bassGain.connect(ctx.destination);
      bass.start(now);
      bass.stop(now + duration);
    }
  }

  static playRaid() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 1.0;

    // Siren sweep
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    
    // Low-pass filter to make the sawtooth sound less harsh
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);

    // Frequency modulation (siren)
    for (let t = 0; t < duration; t += 0.25) {
      osc.frequency.linearRampToValueAtTime(350, now + t + 0.12);
      osc.frequency.linearRampToValueAtTime(200, now + t + 0.24);
    }

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.linearRampToValueAtTime(0.12, now + duration - 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  static playUnlock() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    
    // Play a shiny major arpeggio
    const notes = [1, 1.25, 1.5, 2.0]; // Major chord ratios
    const baseFreq = 440;
    
    notes.forEach((ratio, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteDelay = index * 0.08;
      const noteStart = now + noteDelay;
      const duration = 0.4;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * ratio, noteStart);
      
      gain.gain.setValueAtTime(0.15, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.01, noteStart + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteStart + duration);
    });
  }

  static playGameOver() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 1.2;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(50, now + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + duration);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }
}
