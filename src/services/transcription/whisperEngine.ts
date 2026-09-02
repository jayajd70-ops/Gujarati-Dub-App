import { ITranscriptionEngine, ProgressCallback } from '../../types/engines';
import { TranscriptSegment } from '../../types/project';
import { decodeAudioFromBlob, resampleTo16kHzMono } from './audioUtils';

export class WhisperTranscriptionEngine implements ITranscriptionEngine {
  readonly id = 'whisper';
  readonly name = 'Local Neural Whisper (Client-Side)';
  readonly isLocal = true;

  private worker: Worker | null = null;

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('./whisperWorker.ts', import.meta.url), {
        type: 'module',
      });
    }
    return this.worker;
  }

  async transcribe(
    audioBlob: Blob,
    onProgress?: ProgressCallback
  ): Promise<{
    fullText: string;
    segments: TranscriptSegment[];
  }> {
    if (onProgress) {
      onProgress('Preparing audio', 0, 'Decoding and preparing audio for neural processing...');
    }

    // 1. Decode audio from recorded blob
    const audioBuffer = await decodeAudioFromBlob(audioBlob);
    const audio16kHz = resampleTo16kHzMono(audioBuffer);

    return new Promise((resolve, reject) => {
      const worker = this.getWorker();

      const handleMessage = (event: MessageEvent) => {
        const data = event.data;
        if (data.status === 'loading') {
          if (onProgress) onProgress('Loading speech model', data.progress || 0, data.message);
        } else if (data.status === 'transcribing') {
          if (onProgress) onProgress('Transcribing', 50, data.message);
        } else if (data.status === 'done') {
          worker.removeEventListener('message', handleMessage);
          if (onProgress) onProgress('Transcript ready', 100, 'Transcription complete');

          const rawResult = data.result;
          const fullText = (typeof rawResult === 'string' ? rawResult : rawResult?.text || '').trim();

          const segments: TranscriptSegment[] = [];
          if (rawResult?.chunks && Array.isArray(rawResult.chunks) && rawResult.chunks.length > 0) {
            rawResult.chunks.forEach((c: any, idx: number) => {
              segments.push({
                id: `seg_${idx}_${Date.now()}`,
                start: c.timestamp ? c.timestamp[0] || 0 : 0,
                end: c.timestamp ? c.timestamp[1] || audioBuffer.duration : audioBuffer.duration,
                text: (c.text || '').trim(),
              });
            });
          } else {
            // Single segment fallback
            segments.push({
              id: `seg_0_${Date.now()}`,
              start: 0,
              end: Math.min(30, audioBuffer.duration),
              text: fullText,
            });
          }

          resolve({ fullText, segments });
        } else if (data.status === 'error') {
          worker.removeEventListener('message', handleMessage);
          reject(new Error(data.message || 'Local Whisper transcription failed'));
        }
      };

      worker.addEventListener('message', handleMessage);
      worker.postMessage({ type: 'transcribe', audioData: audio16kHz });
    });
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
