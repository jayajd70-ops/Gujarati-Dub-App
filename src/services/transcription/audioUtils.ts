/**
 * Audio decoding and processing utilities for speech recognition and mixing.
 */

export async function decodeAudioFromBlob(blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioCtx();
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    return audioBuffer;
  } finally {
    audioCtx.close().catch(() => {});
  }
}

/**
 * Resample AudioBuffer to 16kHz mono Float32Array for Whisper
 */
export function resampleTo16kHzMono(audioBuffer: AudioBuffer): Float32Array {
  const targetSampleRate = 16000;
  const numChannels = audioBuffer.numberOfChannels;
  const srcSampleRate = audioBuffer.sampleRate;
  const srcLength = audioBuffer.length;

  // Mix down to mono
  const monoData = new Float32Array(srcLength);
  for (let c = 0; c < numChannels; c++) {
    const channelData = audioBuffer.getChannelData(c);
    for (let i = 0; i < srcLength; i++) {
      monoData[i] += channelData[i] / numChannels;
    }
  }

  if (srcSampleRate === targetSampleRate) {
    return monoData;
  }

  // Linear interpolation resampling to 16000 Hz
  const ratio = srcSampleRate / targetSampleRate;
  const targetLength = Math.round(srcLength / ratio);
  const result = new Float32Array(targetLength);

  for (let i = 0; i < targetLength; i++) {
    const srcIndex = i * ratio;
    const i1 = Math.floor(srcIndex);
    const i2 = Math.min(i1 + 1, srcLength - 1);
    const weight = srcIndex - i1;
    result[i] = monoData[i1] * (1 - weight) + monoData[i2] * weight;
  }

  return result;
}

/**
 * Convert AudioBuffer to 16-bit PCM WAV Blob
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const length = buffer.length * blockAlign;
  const bufferLength = 44 + length;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  /* RIFF identifier */
  writeString(0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + length, true);
  /* RIFF type */
  writeString(8, 'WAVE');
  /* format chunk identifier */
  writeString(12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(36, 'data');
  /* data chunk length */
  view.setUint32(40, length, true);

  // Write interleaved PCM audio samples
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      let sample = buffer.getChannelData(channel)[i];
      // Clamp between -1 and 1
      sample = Math.max(-1, Math.min(1, sample));
      // Scale to 16-bit signed integer
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}
