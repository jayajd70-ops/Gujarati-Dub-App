export type AppStage = 'record' | 'transcript' | 'translate' | 'dub' | 'export';
export type TargetLanguage = 'hi' | 'en';
export type SubtitleFontSize = 'sm' | 'md' | 'lg';

export interface TranscriptSegment {
  id: string;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
}

export interface TranslatedSegment {
  id: string;
  start: number;
  end: number;
  originalText: string;
  translatedText: string;
}

export interface AudioSettings {
  originalAudioVolume: number; // 0.0 to 1.0
  isOriginalMuted: boolean;
  dubbedAudioVolume: number;   // 0.0 to 1.5
}

export interface SubtitleSettings {
  enabled: boolean;
  fontSize: SubtitleFontSize;
  position: 'bottom';
}

export interface ProjectData {
  id: string;
  createdAt: number;
  updatedAt: number;
  currentStage: AppStage;
  videoDuration: number;
  videoWidth: number;
  videoHeight: number;
  gujaratiTranscript: string;
  transcriptSegments: TranscriptSegment[];
  targetLanguage: TargetLanguage;
  translatedText: string;
  translatedSegments: TranslatedSegment[];
  ttsAudioDuration: number;
  audioSettings: AudioSettings;
  subtitleSettings: SubtitleSettings;
  apiKey?: string;
  transcriptionEngine: 'whisper' | 'webspeech' | 'gemini';
  ttsEngine: 'browser-pcm' | 'gemini';
}

export interface StorageProject {
  meta: ProjectData;
  videoBlob?: Blob;
  ttsAudioBlob?: Blob;
  exportedVideoBlob?: Blob;
}
