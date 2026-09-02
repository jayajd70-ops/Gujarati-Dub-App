import { AudioSettings } from '../../types/project';
import { decodeAudioFromBlob } from '../transcription/audioUtils';

export class AudioMixerService {
  /**
   * Sets up a real-time AudioContext mix graph with original video audio
   * and synthesized TTS audio, outputting to a MediaStreamDestinationNode.
   */
  static async createMixStream(
    videoBlob: Blob,
    ttsAudioBlob: Blob,
    audioSettings: AudioSettings,
    _targetDuration: number
  ): Promise<{
    audioStream: MediaStream;
    audioContext: AudioContext;
    startSources: () => void;
    stopSources: () => void;
  }> {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioCtx();

    const dest = audioCtx.createMediaStreamDestination();

    // Decode original video audio
    let originalBuffer: AudioBuffer | null = null;
    try {
      originalBuffer = await decodeAudioFromBlob(videoBlob);
    } catch (e) {
      console.warn('No original audio in video or decode failed:', e);
    }

    // Decode TTS audio
    let ttsBuffer: AudioBuffer | null = null;
    try {
      ttsBuffer = await decodeAudioFromBlob(ttsAudioBlob);
    } catch (e) {
      console.warn('TTS audio decode failed:', e);
    }

    const originalGain = audioCtx.createGain();
    originalGain.gain.value = audioSettings.isOriginalMuted ? 0 : audioSettings.originalAudioVolume;
    originalGain.connect(dest);

    const dubbedGain = audioCtx.createGain();
    dubbedGain.gain.value = audioSettings.dubbedAudioVolume;
    dubbedGain.connect(dest);

    let originalSource: AudioBufferSourceNode | null = null;
    let ttsSource: AudioBufferSourceNode | null = null;

    const startSources = () => {
      const startTime = audioCtx.currentTime + 0.05;

      if (originalBuffer && !audioSettings.isOriginalMuted && audioSettings.originalAudioVolume > 0) {
        originalSource = audioCtx.createBufferSource();
        originalSource.buffer = originalBuffer;
        originalSource.connect(originalGain);
        originalSource.start(startTime);
      }

      if (ttsBuffer && audioSettings.dubbedAudioVolume > 0) {
        ttsSource = audioCtx.createBufferSource();
        ttsSource.buffer = ttsBuffer;
        ttsSource.connect(dubbedGain);
        ttsSource.start(startTime);
      }
    };

    const stopSources = () => {
      try {
        if (originalSource) originalSource.stop();
      } catch (_) {}
      try {
        if (ttsSource) ttsSource.stop();
      } catch (_) {}
      audioCtx.close().catch(() => {});
    };

    return {
      audioStream: dest.stream,
      audioContext: audioCtx,
      startSources,
      stopSources,
    };
  }
}
