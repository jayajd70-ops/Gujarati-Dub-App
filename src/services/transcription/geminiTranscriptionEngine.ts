import { ITranscriptionEngine, ProgressCallback } from '../../types/engines';
import { TranscriptSegment } from '../../types/project';
import { GEMINI_CONFIG } from '../../config/geminiConfig';
import { decodeAudioFromBlob, audioBufferToWavBlob } from './audioUtils';

export class GeminiTranscriptionEngine implements ITranscriptionEngine {
  readonly id = 'gemini';
  readonly name = `Google Gemini (${GEMINI_CONFIG.TRANSCRIPTION_MODEL})`;
  readonly isLocal = false;

  async transcribe(
    audioBlob: Blob,
    onProgress?: ProgressCallback,
    apiKey?: string
  ): Promise<{
    fullText: string;
    segments: TranscriptSegment[];
  }> {
    if (!apiKey) {
      throw new Error('Gemini API key is required for Gemini Transcription. Please set your API key in Settings.');
    }

    if (onProgress) {
      onProgress('Preparing audio', 15, 'Converting audio to WAV for Gemini AI...');
    }

    // Decode and encode to clean WAV
    const audioBuffer = await decodeAudioFromBlob(audioBlob);
    const wavBlob = audioBufferToWavBlob(audioBuffer);

    // Convert to base64
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(wavBlob);
    });
    const base64Audio = await base64Promise;

    if (onProgress) {
      onProgress('Transcribing', 50, `Sending audio to Gemini ${GEMINI_CONFIG.TRANSCRIPTION_MODEL} for Gujarati speech recognition...`);
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CONFIG.TRANSCRIPTION_MODEL}:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'audio/wav',
                data: base64Audio,
              },
            },
            {
              text: `You are an expert Gujarati speech recognition assistant. Transcribe the Gujarati speech from this audio accurately in Gujarati script. 
Return ONLY valid JSON formatted exactly like this:
{
  "fullText": "સંપૂર્ણ ગુજરાતી લખાણ અહીં...",
  "segments": [
    {
      "start": 0.0,
      "end": 3.5,
      "text": "ગુજરાતી વાક્ય અથવા શબ્દસમૂહ"
    }
  ]
}
Do not include markdown backticks or any other text outside the JSON.`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Gemini API error: HTTP ${response.status}`);
    }

    const responseData = await response.json();
    const candidateText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    try {
      const parsed = JSON.parse(candidateText.trim());
      const segments: TranscriptSegment[] = (parsed.segments || []).map((s: any, idx: number) => ({
        id: `gem_seg_${idx}_${Date.now()}`,
        start: typeof s.start === 'number' ? s.start : 0,
        end: typeof s.end === 'number' ? s.end : audioBuffer.duration,
        text: s.text || '',
      }));

      if (onProgress) onProgress('Transcript ready', 100, 'Gemini transcription complete');

      return {
        fullText: parsed.fullText || segments.map((s) => s.text).join(' '),
        segments:
          segments.length > 0
            ? segments
            : [
                {
                  id: `gem_seg_0_${Date.now()}`,
                  start: 0,
                  end: audioBuffer.duration,
                  text: parsed.fullText || '',
                },
              ],
      };
    } catch {
      return {
        fullText: candidateText.trim(),
        segments: [
          {
            id: `gem_seg_0_${Date.now()}`,
            start: 0,
            end: audioBuffer.duration,
            text: candidateText.trim(),
          },
        ],
      };
    }
  }
}
