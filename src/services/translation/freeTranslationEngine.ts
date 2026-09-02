import { ITranslationEngine } from '../../types/engines';
import { TargetLanguage, TranscriptSegment, TranslatedSegment } from '../../types/project';
import { validateTranslation } from '../../utils/textValidation';

export class FreeTranslationEngine implements ITranslationEngine {
  readonly id = 'web-free';
  readonly name = 'Free Web Translation (Requires Internet)';
  readonly isLocal = false;

  private async translateTextChunk(text: string, targetLang: TargetLanguage): Promise<string> {
    const trimmed = text.trim();
    if (!trimmed) return '';

    const langPair = targetLang === 'hi' ? 'gu|hi' : 'gu|en';
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${langPair}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Web translation service returned HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.responseData && data.responseData.translatedText) {
      const resultText = data.responseData.translatedText.trim();
      return resultText;
    }

    throw new Error('Translation service returned an empty response.');
  }

  async translate(
    text: string,
    targetLang: TargetLanguage,
    segments: TranscriptSegment[] = []
  ): Promise<{
    translatedText: string;
    translatedSegments: TranslatedSegment[];
  }> {
    const cleanSource = text.trim();
    if (!cleanSource) {
      throw new Error('Source Gujarati text is empty.');
    }

    const translatedSegments: TranslatedSegment[] = [];

    if (segments.length > 0) {
      for (const seg of segments) {
        const trans = await this.translateTextChunk(seg.text, targetLang);
        translatedSegments.push({
          id: `trans_${seg.id}`,
          start: seg.start,
          end: seg.end,
          originalText: seg.text,
          translatedText: trans,
        });
      }
      const fullTranslatedText = translatedSegments.map((s) => s.translatedText).join(' ').trim();

      // Validate translation output
      const validation = validateTranslation(cleanSource, fullTranslatedText, targetLang);
      if (!validation.isValid) {
        throw new Error(validation.errorReason || 'Translation validation failed.');
      }

      return {
        translatedText: fullTranslatedText,
        translatedSegments,
      };
    } else {
      const trans = await this.translateTextChunk(cleanSource, targetLang);

      // Validate translation output
      const validation = validateTranslation(cleanSource, trans, targetLang);
      if (!validation.isValid) {
        throw new Error(validation.errorReason || 'Translation validation failed.');
      }

      return {
        translatedText: trans,
        translatedSegments: [
          {
            id: `trans_0_${Date.now()}`,
            start: 0,
            end: 30,
            originalText: cleanSource,
            translatedText: trans,
          },
        ],
      };
    }
  }
}
