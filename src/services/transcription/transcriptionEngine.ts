import { ITranscriptionEngine, ProgressCallback } from '../../types/engines';
import { TranscriptSegment } from '../../types/project';
import { WhisperTranscriptionEngine } from './whisperEngine';
import { WebSpeechTranscriptionEngine } from './webSpeechEngine';
import { GeminiTranscriptionEngine } from './geminiTranscriptionEngine';

export class TranscriptionService {
  private static whisperEngine = new WhisperTranscriptionEngine();
  private static webSpeechEngine = new WebSpeechTranscriptionEngine();
  private static geminiEngine = new GeminiTranscriptionEngine();

  static getEngine(type: 'whisper' | 'webspeech' | 'gemini'): ITranscriptionEngine {
    switch (type) {
      case 'whisper':
        return this.whisperEngine;
      case 'webspeech':
        return this.webSpeechEngine;
      case 'gemini':
        return this.geminiEngine;
      default:
        return this.whisperEngine;
    }
  }

  static async transcribe(
    engineType: 'whisper' | 'webspeech' | 'gemini',
    audioBlob: Blob,
    onProgress?: ProgressCallback,
    apiKey?: string
  ): Promise<{
    fullText: string;
    segments: TranscriptSegment[];
  }> {
    const engine = this.getEngine(engineType);
    return engine.transcribe(audioBlob, onProgress, apiKey);
  }
}
