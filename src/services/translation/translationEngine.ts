import { TargetLanguage, TranscriptSegment, TranslatedSegment } from '../../types/project';
import { FreeTranslationEngine } from './freeTranslationEngine';
import { GeminiTranslationEngine } from './geminiTranslationEngine';

export class TranslationService {
  private static freeEngine = new FreeTranslationEngine();
  private static geminiEngine = new GeminiTranslationEngine();

  static async translate(
    text: string,
    targetLang: TargetLanguage,
    segments: TranscriptSegment[] = [],
    useGemini: boolean = false,
    apiKey?: string
  ): Promise<{
    translatedText: string;
    translatedSegments: TranslatedSegment[];
  }> {
    if (useGemini && apiKey) {
      try {
        return await this.geminiEngine.translate(text, targetLang, segments, apiKey);
      } catch (e) {
        console.warn('Gemini translation failed, falling back to instant translation:', e);
      }
    }
    return await this.freeEngine.translate(text, targetLang, segments);
  }
}
