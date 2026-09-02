import { useState, useEffect, useCallback } from 'react';
import { ProjectData, AppStage, TargetLanguage, TranscriptSegment, TranslatedSegment } from '../types/project';
import { MediaStore, DEFAULT_PROJECT_DATA } from '../services/storage/mediaStore';

export function useProject() {
  const [project, setProject] = useState<ProjectData>(DEFAULT_PROJECT_DATA);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [ttsAudioBlob, setTtsAudioBlob] = useState<Blob | null>(null);
  const [exportedVideoBlob, setExportedVideoBlob] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load from IndexedDB on mount
  useEffect(() => {
    async function init() {
      try {
        const data = await MediaStore.loadProject();
        // Load API key from localStorage if present
        const savedApiKey = localStorage.getItem('gds_gemini_api_key') || undefined;
        setProject({ ...data.meta, apiKey: savedApiKey });
        setVideoBlob(data.videoBlob);
        setTtsAudioBlob(data.ttsAudioBlob);
        setExportedVideoBlob(data.exportedVideoBlob);
      } catch (err) {
        console.error('Failed to load project from IndexedDB:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const setStage = useCallback(async (stage: AppStage) => {
    setProject((prev) => {
      const updated = { ...prev, currentStage: stage };
      MediaStore.saveProjectMeta(updated);
      return updated;
    });
  }, []);

  const saveRecordedVideo = useCallback(async (blob: Blob, duration: number, width = 720, height = 1280) => {
    setVideoBlob(blob);
    setTtsAudioBlob(null);
    setExportedVideoBlob(null);
    setProject((prev) => {
      const updated: ProjectData = {
        ...prev,
        videoDuration: duration,
        videoWidth: width,
        videoHeight: height,
        currentStage: 'transcript',
        // Invalidate all downstream state
        gujaratiTranscript: '',
        transcriptSegments: [],
        translatedText: '',
        translatedSegments: [],
        ttsAudioDuration: 0,
      };
      MediaStore.saveOriginalVideo(blob, updated);
      return updated;
    });
  }, []);

  const updateTranscript = useCallback(async (transcript: string, segments: TranscriptSegment[]) => {
    // Invalidate downstream: translation, TTS audio, and exported video
    setTtsAudioBlob(null);
    setExportedVideoBlob(null);
    setProject((prev) => {
      const updated: ProjectData = {
        ...prev,
        gujaratiTranscript: transcript,
        transcriptSegments: segments,
        translatedText: '',
        translatedSegments: [],
        ttsAudioDuration: 0,
      };
      MediaStore.deleteTtsAudio();
      MediaStore.deleteExportedVideo();
      MediaStore.saveProjectMeta(updated);
      return updated;
    });
  }, []);

  const updateTargetLanguage = useCallback(async (lang: TargetLanguage) => {
    // Invalidate translation, TTS audio, and exported video
    setTtsAudioBlob(null);
    setExportedVideoBlob(null);
    setProject((prev) => {
      const updated: ProjectData = {
        ...prev,
        targetLanguage: lang,
        translatedText: '',
        translatedSegments: [],
        ttsAudioDuration: 0,
      };
      MediaStore.deleteTtsAudio();
      MediaStore.deleteExportedVideo();
      MediaStore.saveProjectMeta(updated);
      return updated;
    });
  }, []);

  const updateTranslation = useCallback(async (translatedText: string, segments: TranslatedSegment[]) => {
    // Invalidate dependent voice and export
    setTtsAudioBlob(null);
    setExportedVideoBlob(null);
    setProject((prev) => {
      const updated: ProjectData = {
        ...prev,
        translatedText,
        translatedSegments: segments,
        ttsAudioDuration: 0,
      };
      MediaStore.deleteTtsAudio();
      MediaStore.deleteExportedVideo();
      MediaStore.saveProjectMeta(updated);
      return updated;
    });
  }, []);

  const saveTtsAudio = useCallback(async (blob: Blob, duration: number) => {
    setTtsAudioBlob(blob);
    setExportedVideoBlob(null);
    setProject((prev) => {
      const updated: ProjectData = {
        ...prev,
        ttsAudioDuration: duration,
      };
      MediaStore.saveTtsAudio(blob, updated);
      return updated;
    });
  }, []);

  const updateAudioSettings = useCallback(async (settings: Partial<ProjectData['audioSettings']>) => {
    // Changing audio settings invalidates exported video only
    setExportedVideoBlob(null);
    setProject((prev) => {
      const updated: ProjectData = {
        ...prev,
        audioSettings: { ...prev.audioSettings, ...settings },
      };
      MediaStore.deleteExportedVideo();
      MediaStore.saveProjectMeta(updated);
      return updated;
    });
  }, []);

  const updateSubtitleSettings = useCallback(async (settings: Partial<ProjectData['subtitleSettings']>) => {
    // Changing subtitle settings invalidates exported video only
    setExportedVideoBlob(null);
    setProject((prev) => {
      const updated: ProjectData = {
        ...prev,
        subtitleSettings: { ...prev.subtitleSettings, ...settings },
      };
      MediaStore.deleteExportedVideo();
      MediaStore.saveProjectMeta(updated);
      return updated;
    });
  }, []);

  const saveExportedVideo = useCallback(async (blob: Blob) => {
    setExportedVideoBlob(blob);
    setProject((prev) => {
      const updated = { ...prev };
      MediaStore.saveExportedVideo(blob, updated);
      return updated;
    });
  }, []);

  const setApiKey = useCallback((key: string) => {
    if (key) {
      localStorage.setItem('gds_gemini_api_key', key);
    } else {
      localStorage.removeItem('gds_gemini_api_key');
    }
    setProject((prev) => ({ ...prev, apiKey: key }));
  }, []);

  const clearProject = useCallback(async () => {
    const fresh = await MediaStore.clearProject();
    const savedApiKey = localStorage.getItem('gds_gemini_api_key') || undefined;
    setProject({ ...fresh, apiKey: savedApiKey });
    setVideoBlob(null);
    setTtsAudioBlob(null);
    setExportedVideoBlob(null);
  }, []);

  return {
    project,
    videoBlob,
    ttsAudioBlob,
    exportedVideoBlob,
    isLoading,
    setStage,
    saveRecordedVideo,
    updateTranscript,
    updateTargetLanguage,
    updateTranslation,
    saveTtsAudio,
    updateAudioSettings,
    updateSubtitleSettings,
    saveExportedVideo,
    setApiKey,
    clearProject,
  };
}
