import { ITTSEngine } from '../../types/engines';
import { TargetLanguage, TranslatedSegment } from '../../types/project';
import { GEMINI_CONFIG } from '../../config/geminiConfig';
import { audioBufferToWavBlob } from '../transcription/audioUtils';

export class ExportableTtsEngine implements ITTSEngine {
  readonly id = 'exportable-tts';
  readonly name = 'Natural Spoken TTS Voice Engine';
  readonly isLocal = false;

  private worker: Worker | null = null;

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('./ttsWorker.ts', import.meta.url), {
        type: 'module',
      });
    }
    return this.worker;
  }

  /**
   * Generates genuine, intelligible, exportable spoken audio bytes
   * via Gemini dedicated TTS generation (gemini-2.5-flash-preview-tts)
   * or local Neural MMS-TTS worker.
   */
  async generateSpeech(
    text: string,
    targetLang: TargetLanguage,
    _segments: TranslatedSegment[] = [],
    _targetDuration: number = 30,
    apiKey?: string
  ): Promise<{
    audioBlob: Blob;
    audioBuffer: AudioBuffer;
    duration: number;
    provider: 'gemini-tts' | 'local-mms';
  }> {
    const cleanText = text.trim();
    if (!cleanText) {
      throw new Error('No translated text to synthesize.');
    }

    // 1. If Gemini API key is provided, use official dedicated Gemini TTS model
    if (apiKey) {
      try {
        const geminiResult = await this.generateGeminiSpeech(cleanText, targetLang, apiKey);
        return {
          ...geminiResult,
          provider: 'gemini-tts',
        };
      } catch (err: any) {
        console.warn(`Gemini dedicated TTS (${GEMINI_CONFIG.TTS_MODEL}) failed, attempting local neural MMS-TTS:`, err);
      }
    }

    // 2. Fall back to local neural MMS-TTS worker
    try {
      const localResult = await this.generateLocalNeuralSpeech(cleanText, targetLang);
      return {
        ...localResult,
        provider: 'local-mms',
      };
    } catch (localErr: any) {
      throw new Error(
        `Speech generation failed: ${localErr.message || 'Unknown error'}. Please configure a Gemini API key in Settings for cloud TTS (${GEMINI_CONFIG.TTS_MODEL}), or ensure internet is connected for local MMS-TTS model initialization.`
      );
    }
  }

  /**
   * Dedicated Gemini TTS generation (gemini-2.5-flash-preview-tts)
   * https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-preview-tts
   */
  private async generateGeminiSpeech(
    text: string,
    targetLang: TargetLanguage,
    apiKey: string
  ): Promise<{
    audioBlob: Blob;
    audioBuffer: AudioBuffer;
    duration: number;
  }> {
    const langPrompt = targetLang === 'hi' ? 'Hindi' : 'English';
    const voiceName = targetLang === 'hi' ? GEMINI_CONFIG.VOICES.HINDI : GEMINI_CONFIG.VOICES.ENGLISH;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CONFIG.TTS_MODEL}:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Read the following ${langPrompt} text aloud with natural, clear, spoken pronunciation suitable for video dubbing: "${text}"`,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceName,
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `Gemini TTS API (${GEMINI_CONFIG.TTS_MODEL}) returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const inlineData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inlineData || !inlineData.data) {
      throw new Error('Gemini TTS API did not return audio data.');
    }

    // Convert base64 audio to ArrayBuffer & AudioBuffer
    const binaryStr = atob(inlineData.data);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    try {
      const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
      const wavBlob = audioBufferToWavBlob(audioBuffer);
      return {
        audioBlob: wavBlob,
        audioBuffer,
        duration: audioBuffer.duration,
      };
    } finally {
      ctx.close().catch(() => {});
    }
  }

  /**
   * Local Neural MMS-TTS via Web Worker
   * Models: Xenova/mms-tts-hin and Xenova/mms-tts-eng
   */
  private async generateLocalNeuralSpeech(
    text: string,
    targetLang: TargetLanguage
  ): Promise<{
    audioBlob: Blob;
    audioBuffer: AudioBuffer;
    duration: number;
  }> {
    const worker = this.getWorker();

    return new Promise((resolve, reject) => {
      const handleMessage = async (event: MessageEvent) => {
        const data = event.data;
        if (data.status === 'done') {
          worker.removeEventListener('message', handleMessage);

          const rawAudio: Float32Array = data.audioData;
          const sampleRate: number = data.sampleRate || 16000;

          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioCtx({ sampleRate });
          try {
            const buffer = ctx.createBuffer(1, rawAudio.length, sampleRate);
            const channelData = buffer.getChannelData(0);
            for (let i = 0; i < rawAudio.length; i++) {
              channelData[i] = rawAudio[i];
            }

            const wavBlob = audioBufferToWavBlob(buffer);
            resolve({
              audioBlob: wavBlob,
              audioBuffer: buffer,
              duration: buffer.duration,
            });
          } finally {
            ctx.close().catch(() => {});
          }
        } else if (data.status === 'error') {
          worker.removeEventListener('message', handleMessage);
          reject(new Error(data.message || 'Local neural TTS failed'));
        }
      };

      worker.addEventListener('message', handleMessage);
      worker.postMessage({
        type: 'synthesize',
        text,
        lang: targetLang,
      });
    });
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
