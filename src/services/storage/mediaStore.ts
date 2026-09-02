import { ProjectData } from '../../types/project';
import { idbStore } from './idbStore';

export const DEFAULT_PROJECT_DATA: ProjectData = {
  id: 'proj_default',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  currentStage: 'record',
  videoDuration: 0,
  videoWidth: 720,
  videoHeight: 1280,
  gujaratiTranscript: '',
  transcriptSegments: [],
  targetLanguage: 'hi',
  translatedText: '',
  translatedSegments: [],
  ttsAudioDuration: 0,
  audioSettings: {
    originalAudioVolume: 0.15, // Default reduced original audio to keep ambience
    isOriginalMuted: false,
    dubbedAudioVolume: 1.0,
  },
  subtitleSettings: {
    enabled: true,
    fontSize: 'md',
    position: 'bottom',
  },
  transcriptionEngine: 'whisper',
  ttsEngine: 'browser-pcm',
};

export class MediaStore {
  private static cachedObjectUrls: Map<string, string> = new Map();

  static getObjectUrl(key: string, blob: Blob): string {
    if (this.cachedObjectUrls.has(key)) {
      URL.revokeObjectURL(this.cachedObjectUrls.get(key)!);
    }
    const url = URL.createObjectURL(blob);
    this.cachedObjectUrls.set(key, url);
    return url;
  }

  static revokeObjectUrl(key: string) {
    if (this.cachedObjectUrls.has(key)) {
      URL.revokeObjectURL(this.cachedObjectUrls.get(key)!);
      this.cachedObjectUrls.delete(key);
    }
  }

  static async loadProject(): Promise<{
    meta: ProjectData;
    videoBlob: Blob | null;
    ttsAudioBlob: Blob | null;
    exportedVideoBlob: Blob | null;
  }> {
    const meta = (await idbStore.getProjectMeta()) || { ...DEFAULT_PROJECT_DATA, id: `proj_${Date.now()}` };
    const videoBlob = await idbStore.getBlob('video_original');
    const ttsAudioBlob = await idbStore.getBlob('tts_audio');
    const exportedVideoBlob = await idbStore.getBlob('video_exported');

    return {
      meta,
      videoBlob,
      ttsAudioBlob,
      exportedVideoBlob,
    };
  }

  static async saveProjectMeta(meta: ProjectData): Promise<void> {
    meta.updatedAt = Date.now();
    await idbStore.saveProjectMeta(meta);
  }

  static async saveOriginalVideo(blob: Blob, meta: ProjectData): Promise<void> {
    await idbStore.saveBlob('video_original', blob, blob.type || 'video/mp4');
    await this.deleteTtsAudio();
    await this.deleteExportedVideo();
    await this.saveProjectMeta(meta);
  }

  static async saveTtsAudio(blob: Blob, meta: ProjectData): Promise<void> {
    await idbStore.saveBlob('tts_audio', blob, blob.type || 'audio/wav');
    await this.deleteExportedVideo();
    await this.saveProjectMeta(meta);
  }

  static async saveExportedVideo(blob: Blob, meta: ProjectData): Promise<void> {
    await idbStore.saveBlob('video_exported', blob, blob.type || 'video/mp4');
    await this.saveProjectMeta(meta);
  }

  static async deleteTtsAudio(): Promise<void> {
    this.revokeObjectUrl('tts_audio');
    await idbStore.deleteBlob('tts_audio');
  }

  static async deleteExportedVideo(): Promise<void> {
    this.revokeObjectUrl('video_exported');
    await idbStore.deleteBlob('video_exported');
  }

  static async clearProject(): Promise<ProjectData> {
    for (const [, url] of this.cachedObjectUrls) {
      URL.revokeObjectURL(url);
    }
    this.cachedObjectUrls.clear();
    await idbStore.clearAll();
    const fresh: ProjectData = {
      ...DEFAULT_PROJECT_DATA,
      id: `proj_${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await idbStore.saveProjectMeta(fresh);
    return fresh;
  }
}
