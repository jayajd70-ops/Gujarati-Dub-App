import { TranslatedSegment } from '../../types/project';

export interface TimedSpeechUnit {
  segmentId: string;
  text: string;
  start: number;
  duration: number;
  end: number;
  wordCount: number;
  exceedsDuration: boolean;
}

export class AudioTimingEngine {
  /**
   * Calculate timing alignment for translated segments against video duration.
   * Standard conversational speech is approx ~2.5 - 3.2 words per second (150-180 wpm).
   */
  static alignSegments(
    segments: TranslatedSegment[],
    totalVideoDuration: number
  ): {
    timedUnits: TimedSpeechUnit[];
    totalCalculatedDuration: number;
    hasWarning: boolean;
    warningMessage?: string;
  } {
    const timedUnits: TimedSpeechUnit[] = [];
    const safeVideoDuration = Math.max(1, totalVideoDuration || 30);
    const WORDS_PER_SECOND = 2.8;

    let previousEnd = 0;
    let hasWarning = false;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const words = seg.translatedText.trim().split(/\s+/).filter(Boolean);
      const wordCount = Math.max(1, words.length);
      const idealDuration = wordCount / WORDS_PER_SECOND;

      let start = typeof seg.start === 'number' && seg.start >= 0 ? seg.start : previousEnd;
      // Ensure start doesn't overlap previous
      if (start < previousEnd) {
        start = previousEnd;
      }

      // If segment exceeds available video duration
      let exceedsDuration = false;
      if (start + idealDuration > safeVideoDuration) {
        exceedsDuration = true;
        hasWarning = true;
      }

      const duration = Math.min(safeVideoDuration - start, Math.max(1.0, idealDuration));
      const end = start + duration;

      timedUnits.push({
        segmentId: seg.id,
        text: seg.translatedText,
        start,
        duration,
        end,
        wordCount,
        exceedsDuration,
      });

      previousEnd = end + 0.2; // 200ms natural pause
    }

    const totalCalculatedDuration = timedUnits.length > 0 ? timedUnits[timedUnits.length - 1].end : 0;

    return {
      timedUnits,
      totalCalculatedDuration,
      hasWarning,
      warningMessage: hasWarning
        ? `Translated text is slightly long for the ${safeVideoDuration.toFixed(0)}s video. Speech rate will be adjusted automatically.`
        : undefined,
    };
  }
}
