import { TargetLanguage, TranslatedSegment } from '../../types/project';
import { ExportableTtsEngine } from './exportableTtsEngine';

export class TTSService {
  private static exportableEngine = new ExportableTtsEngine();

  static async generateSpeech(
    text: string,
    targetLang: TargetLanguage,
    segments: TranslatedSegment[] = [],
    targetDuration: number = 30,
    apiKey?: string
  ): Promise<{
    audioBlob: Blob;
    audioBuffer: AudioBuffer;
    duration: number;
  }> {
    return this.exportableEngine.generateSpeech(text, targetLang, segments, targetDuration, apiKey);
  }
}
