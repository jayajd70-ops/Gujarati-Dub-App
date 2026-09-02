import { ProjectData, TargetLanguage, TranscriptSegment, TranslatedSegment } from './project';

export interface CameraConstraintsOptions {
  idealWidth?: number;
  idealHeight?: number;
  idealFrameRate?: number;
  facingMode?: 'user' | 'environment';
}

export interface CameraStreamInfo {
  stream: MediaStream;
  actualWidth: number;
  actualHeight: number;
  actualFps: number;
  facingMode: 'user' | 'environment';
}

export interface ProgressCallback {
  (stage: string, progress?: number, message?: string): void;
}

export interface ITranscriptionEngine {
  readonly id: string;
  readonly name: string;
  readonly isLocal: boolean;
  transcribe(audioBlob: Blob, onProgress?: ProgressCallback, apiKey?: string): Promise<{
    fullText: string;
    segments: TranscriptSegment[];
  }>;
}

export interface ITranslationEngine {
  readonly id: string;
  readonly name: string;
  readonly isLocal: boolean;
  translate(
    text: string,
    targetLang: TargetLanguage,
    segments?: TranscriptSegment[],
    apiKey?: string
  ): Promise<{
    translatedText: string;
    translatedSegments: TranslatedSegment[];
  }>;
}

export interface ITTSEngine {
  readonly id: string;
  readonly name: string;
  readonly isLocal: boolean;
  generateSpeech(
    text: string,
    targetLang: TargetLanguage,
    segments?: TranslatedSegment[],
    targetDuration?: number,
    apiKey?: string
  ): Promise<{
    audioBlob: Blob;
    audioBuffer: AudioBuffer;
    duration: number;
  }>;
}

export interface ISubtitleEngine {
  generateSubtitles(
    segments: TranslatedSegment[],
    totalDuration: number
  ): {
    segments: TranslatedSegment[];
    getActiveSubtitle(currentTime: number): string | null;
  };
}

export interface IVideoExportEngine {
  exportVideo(params: {
    videoBlob: Blob;
    ttsAudioBlob: Blob;
    subtitles: TranslatedSegment[];
    subtitleSettings: ProjectData['subtitleSettings'];
    audioSettings: ProjectData['audioSettings'];
    onProgress?: (percent: number, status: string) => void;
  }): Promise<{
    videoBlob: Blob;
    mimeType: string;
    extension: 'mp4' | 'webm';
  }>;
}
