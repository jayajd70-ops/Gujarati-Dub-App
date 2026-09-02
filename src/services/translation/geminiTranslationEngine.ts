import { ITranslationEngine } from '../../types/engines';
import { TargetLanguage, TranscriptSegment, TranslatedSegment } from '../../types/project';
import { GEMINI_CONFIG } from '../../config/geminiConfig';
import { validateTranslation } from '../../utils/textValidation';

export class GeminiTranslationEngine implements ITranslationEngine {
  readonly id = 'gemini';
  readonly name = `Google Gemini (${GEMINI_CONFIG.TRANSLATION_MODEL})`;
  readonly isLocal = false;

  async translate(
    text: string,
    targetLang: TargetLanguage,
    segments: TranscriptSegment[] = [],
    apiKey?: string
  ): Promise<{
    translatedText: string;
    translatedSegments: TranslatedSegment[];
  }> {
    if (!apiKey) {
      throw new Error('Gemini API key is required for Gemini Translation. Please enter your API key in Settings.');
    }

    const cleanSource = text.trim();
    const targetLangName = targetLang === 'hi' ? 'Hindi (हिन्दी)' : 'English';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CONFIG.TRANSLATION_MODEL}:generateContent?key=${apiKey}`;

    const prompt = `You are a professional video dubbing translator. Translate the following Gujarati video transcript into natural, spoken ${targetLangName}.
Preserve conversational tone, concise pacing so it fits spoken video dubbing time, and match the timestamps.
Important: Output ONLY the translated text in the target language's proper script (${targetLang === 'hi' ? 'Devanagari script for Hindi' : 'Latin alphabet for English'}).

Gujarati Transcript:
${JSON.stringify(segments.length > 0 ? segments : [{ start: 0, end: 30, text: cleanSource }])}

Return ONLY valid JSON matching this schema:
{
  "fullTranslatedText": "Complete translated text...",
  "segments": [
    {
      "start": 0.0,
      "end": 3.5,
      "originalText": "original gujarati",
      "translatedText": "translated text"
    }
  ]
}
Do not include markdown quotes, backticks, or any additional text.`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Gemini Translation failed: HTTP ${response.status}`);
    }

    const resData = await response.json();
    const candidateText = resData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    try {
      const parsed = JSON.parse(candidateText.trim());
      const translatedSegments: TranslatedSegment[] = (parsed.segments || []).map((s: any, idx: number) => ({
        id: `trans_gem_${idx}_${Date.now()}`,
        start: typeof s.start === 'number' ? s.start : 0,
        end: typeof s.end === 'number' ? s.end : 30,
        originalText: s.originalText || '',
        translatedText: s.translatedText || '',
      }));

      const fullTranslatedText = (parsed.fullTranslatedText || translatedSegments.map((s) => s.translatedText).join(' ')).trim();

      const validation = validateTranslation(cleanSource, fullTranslatedText, targetLang);
      if (!validation.isValid) {
        throw new Error(validation.errorReason || 'Gemini translation validation failed.');
      }

      return {
        translatedText: fullTranslatedText,
        translatedSegments,
      };
    } catch (err: any) {
      const rawText = candidateText.trim();
      const validation = validateTranslation(cleanSource, rawText, targetLang);
      if (!validation.isValid) {
        throw new Error(validation.errorReason || err.message || 'Gemini translation output is invalid.');
      }

      return {
        translatedText: rawText,
        translatedSegments: [
          {
            id: `trans_gem_0_${Date.now()}`,
            start: 0,
            end: 30,
            originalText: cleanSource,
            translatedText: rawText,
          },
        ],
      };
    }
  }
}
