/**
 * Centralized configuration for Google Gemini API models.
 * Uses official, currently supported Gemini models for translation, audio transcription,
 * and dedicated TTS speech generation.
 */

export const GEMINI_CONFIG = {
  // Primary multimodal/text model for dubbing translation and transcription
  TRANSLATION_MODEL: 'gemini-3.6-flash',
  TRANSCRIPTION_MODEL: 'gemini-3.6-flash',

  // Dedicated official TTS model for audio/speech synthesis
  // https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-preview-tts
  TTS_MODEL: 'gemini-2.5-flash-preview-tts',

  // Prebuilt voice identifiers
  VOICES: {
    HINDI: 'Puck',    // Natural Hindi dubbing voice
    ENGLISH: 'Aoede',  // Natural English dubbing voice
  },
} as const;
