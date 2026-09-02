/**
 * Text validation utilities for Gujarati transcript and Hindi/English translations.
 * Prevents hallucinations, empty recognition, and unchanged passthroughs from propagating.
 */

export interface ValidationResult {
  isValid: boolean;
  errorReason?: string;
  gujaratiCharCount?: number;
  devanagariCharCount?: number;
  latinCharCount?: number;
}

const GUJARATI_REGEX = /[\u0A80-\u0AFF]/g;
const DEVANAGARI_REGEX = /[\u0900-\u097F]/g;
const LATIN_REGEX = /[a-zA-Z]/g;

/**
 * Validates that an automatic or manual transcript contains genuine Gujarati script.
 * Rejects empty text, hallucinated English, or non-Gujarati output.
 */
export function validateGujaratiTranscript(text: string | null | undefined): ValidationResult {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return {
      isValid: false,
      errorReason: 'Transcript is empty. No Gujarati speech was detected.',
      gujaratiCharCount: 0,
      latinCharCount: 0,
    };
  }

  const gujaratiMatches = trimmed.match(GUJARATI_REGEX) || [];
  const latinMatches = trimmed.match(LATIN_REGEX) || [];
  const gujaratiCharCount = gujaratiMatches.length;
  const latinCharCount = latinMatches.length;

  if (gujaratiCharCount === 0) {
    if (latinCharCount > 0) {
      return {
        isValid: false,
        errorReason: 'Speech recognizer hallucinated English text instead of recognizing Gujarati speech.',
        gujaratiCharCount,
        latinCharCount,
      };
    }
    return {
      isValid: false,
      errorReason: 'No Gujarati script characters were detected in the transcript.',
      gujaratiCharCount,
      latinCharCount,
    };
  }

  // If Latin characters outnumber or dominate Gujarati characters
  if (latinCharCount >= gujaratiCharCount) {
    return {
      isValid: false,
      errorReason: 'Transcript is predominantly Latin/English characters rather than Gujarati speech.',
      gujaratiCharCount,
      latinCharCount,
    };
  }

  // Check ratio against total letters
  const totalAlpha = gujaratiCharCount + latinCharCount;
  const gujaratiRatio = gujaratiCharCount / totalAlpha;
  if (gujaratiRatio < 0.6) {
    return {
      isValid: false,
      errorReason: 'Insufficient Gujarati script detected (potential recognizer hallucination).',
      gujaratiCharCount,
      latinCharCount,
    };
  }

  return {
    isValid: true,
    gujaratiCharCount,
    latinCharCount,
  };
}

/**
 * Validates that a translation into Hindi or English is meaningful, non-empty,
 * not identical to the source Gujarati text, and in the expected script.
 */
export function validateTranslation(
  sourceGujarati: string | null | undefined,
  translatedText: string | null | undefined,
  targetLang: 'hi' | 'en'
): ValidationResult {
  const cleanSource = (sourceGujarati || '').trim();
  const cleanTrans = (translatedText || '').trim();

  if (!cleanTrans) {
    return {
      isValid: false,
      errorReason: 'Translation is empty. Please translate the text or enter translation manually.',
    };
  }

  // Reject identical or verbatim passthrough
  if (cleanSource && cleanSource === cleanTrans) {
    return {
      isValid: false,
      errorReason: 'Translation service returned the original Gujarati text unchanged.',
    };
  }

  const gujaratiMatches = cleanTrans.match(GUJARATI_REGEX) || [];
  const devanagariMatches = cleanTrans.match(DEVANAGARI_REGEX) || [];
  const latinMatches = cleanTrans.match(LATIN_REGEX) || [];

  const gujaratiCount = gujaratiMatches.length;
  const devanagariCount = devanagariMatches.length;
  const latinCount = latinMatches.length;

  if (targetLang === 'hi') {
    if (devanagariCount === 0) {
      if (gujaratiCount > 0) {
        return {
          isValid: false,
          errorReason: 'Hindi translation returned Gujarati script instead of Hindi Devanagari.',
          gujaratiCharCount: gujaratiCount,
          devanagariCharCount: devanagariCount,
        };
      }
      return {
        isValid: false,
        errorReason: 'No Hindi (Devanagari) script characters detected in translation output.',
        devanagariCharCount: 0,
      };
    }

    if (gujaratiCount >= devanagariCount) {
      return {
        isValid: false,
        errorReason: 'Hindi translation contains predominantly Gujarati script.',
        gujaratiCharCount: gujaratiCount,
        devanagariCharCount: devanagariCount,
      };
    }
  } else if (targetLang === 'en') {
    if (latinCount === 0) {
      if (gujaratiCount > 0) {
        return {
          isValid: false,
          errorReason: 'English translation returned Gujarati script instead of English text.',
          gujaratiCharCount: gujaratiCount,
          latinCharCount: latinCount,
        };
      }
      return {
        isValid: false,
        errorReason: 'No English (Latin) script characters detected in translation output.',
        latinCharCount: 0,
      };
    }

    if (gujaratiCount >= latinCount) {
      return {
        isValid: false,
        errorReason: 'English translation contains predominantly Gujarati script.',
        gujaratiCharCount: gujaratiCount,
        latinCharCount: latinCount,
      };
    }
  }

  return {
    isValid: true,
    gujaratiCharCount: gujaratiCount,
    devanagariCharCount: devanagariCount,
    latinCharCount: latinCount,
  };
}
