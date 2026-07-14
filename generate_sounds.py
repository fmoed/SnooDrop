import numpy as np
import scipy.io.wavfile as wavfile
import os

SAMPLE_RATE = 44100

def save_wav(filename, audio_data):
    # Normalize to prevent clipping
    max_val = np.max(np.abs(audio_data))
    if max_val > 0:
        audio_data = audio_data / max_val
    audio_data = np.int16(audio_data * 32767)
    wavfile.write(filename, SAMPLE_RATE, audio_data)

def generate_drop():
    t = np.linspace(0, 0.15, int(SAMPLE_RATE * 0.15), False)
    # Frequency rises rapidly from 300 to 1000 for a plop sound
    freq = np.linspace(300, 1000, len(t))
    phase = 2 * np.pi * np.cumsum(freq) / SAMPLE_RATE
    audio = np.sin(phase)
    envelope = np.exp(-t * 20)
    return audio * envelope

def generate_stone():
    t = np.linspace(0, 0.15, int(SAMPLE_RATE * 0.15), False)
    noise = np.random.normal(0, 1, len(t))
    # Simple lowpass filter via rolling average
    kernel = np.ones(20) / 20
    noise_filtered = np.convolve(noise, kernel, mode='same')
    envelope = np.exp(-t * 30)
    
    # Deep impact thump
    thump = np.sin(2 * np.pi * 80 * t) * np.exp(-t * 15)
    return noise_filtered * envelope * 0.6 + thump * 1.2

def generate_fire():
    t = np.linspace(0, 0.3, int(SAMPLE_RATE * 0.3), False)
    noise = np.random.normal(0, 1, len(t))
    # Rough bandpass approximation
    kernel = np.ones(5) / 5
    noise_filtered = np.convolve(noise, kernel, mode='same')
    envelope = (1 - np.exp(-t * 30)) * np.exp(-t * 10)
    return noise_filtered * envelope

def generate_chime():
    t = np.linspace(0, 1.2, int(SAMPLE_RATE * 1.2), False)
    freqs = [1200, 3312, 6480, 10680]
    audio = np.zeros_like(t)
    for i, f in enumerate(freqs):
        decay = 3 + i
        audio += np.sin(2 * np.pi * f * t) * np.exp(-t * decay) * (1 / (i + 1))
    return audio

def generate_magic():
    t = np.linspace(0, 2.0, int(SAMPLE_RATE * 2.0), False)
    audio = np.zeros_like(t)
    base_freq = 150
    # Ethereal Pad
    for mult in [0.5, 1.0, 1.5, 2.0]:
        audio += np.sin(2 * np.pi * (base_freq * mult) * t) * 0.3
    pad_env = (1 - np.exp(-t * 5)) * np.exp(-t * 2)
    audio *= pad_env
    
    # Deep Bass Drop
    bass_freq = np.linspace(100, 20, len(t))
    phase = 2 * np.pi * np.cumsum(bass_freq) / SAMPLE_RATE
    bass = np.sin(phase) * np.exp(-t * 3)
    
    return audio + bass * 0.8

def main():
    asset_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public', 'assets')
    os.makedirs(asset_dir, exist_ok=True)
    save_wav(os.path.join(asset_dir, 'drop.wav'), generate_drop())
    save_wav(os.path.join(asset_dir, 'stone.wav'), generate_stone())
    save_wav(os.path.join(asset_dir, 'fire.wav'), generate_fire())
    save_wav(os.path.join(asset_dir, 'chime.wav'), generate_chime())
    save_wav(os.path.join(asset_dir, 'magic.wav'), generate_magic())
    print("Generated all high-quality audio files.")

if __name__ == '__main__':
    main()
