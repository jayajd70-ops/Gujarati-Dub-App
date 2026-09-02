import React, { useState } from 'react';
import { useProject } from './hooks/useProject';
import { Header } from './components/layout/Header';
import { StepNavigation } from './components/layout/StepNavigation';
import { ApiKeyModal } from './components/layout/ApiKeyModal';
import { CameraRecordStep } from './components/steps/CameraRecordStep';
import { TranscriptStep } from './components/steps/TranscriptStep';
import { TranslateStep } from './components/steps/TranslateStep';
import { DubVoiceStep } from './components/steps/DubVoiceStep';
import { ExportStep } from './components/steps/ExportStep';
import { AppStage } from './types/project';
import { validateGujaratiTranscript, validateTranslation } from './utils/textValidation';

export const App: React.FC = () => {
  const {
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
  } = useProject();

  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading Gujarati Dub Studio...</p>
      </div>
    );
  }

  const canNavigateTo = (stage: AppStage): boolean => {
    switch (stage) {
      case 'record':
        return true;
      case 'transcript':
        return !!videoBlob;
      case 'translate':
        return !!videoBlob && validateGujaratiTranscript(project.gujaratiTranscript).isValid;
      case 'dub':
        return (
          !!videoBlob &&
          validateGujaratiTranscript(project.gujaratiTranscript).isValid &&
          validateTranslation(project.gujaratiTranscript, project.translatedText, project.targetLanguage).isValid
        );
      case 'export':
        return !!ttsAudioBlob;
      default:
        return false;
    }
  };

  const handleClearProjectConfirm = async () => {
    if (window.confirm('Delete this recording and start a fresh project? All local trial data will be removed.')) {
      await clearProject();
    }
  };

  return (
    <div className="app-container">
      <Header
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onClearProject={handleClearProjectConfirm}
        hasApiKey={!!project.apiKey}
        hasProjectData={!!videoBlob}
      />

      <StepNavigation
        currentStage={project.currentStage}
        onSelectStage={setStage}
        canNavigateTo={canNavigateTo}
      />

      <main className="main-content">
        {project.currentStage === 'record' && (
          <CameraRecordStep
            existingVideoBlob={videoBlob}
            onVideoRecorded={(blob, duration, w, h) => saveRecordedVideo(blob, duration, w, h)}
            onProceedToTranscript={() => setStage('transcript')}
          />
        )}

        {project.currentStage === 'transcript' && (
          <TranscriptStep
            project={project}
            videoBlob={videoBlob}
            onUpdateTranscript={updateTranscript}
            onProceedToTranslate={() => setStage('translate')}
            onBackToRecord={() => setStage('record')}
          />
        )}

        {project.currentStage === 'translate' && (
          <TranslateStep
            project={project}
            onUpdateTargetLanguage={updateTargetLanguage}
            onUpdateTranslation={updateTranslation}
            onProceedToDubVoice={() => setStage('dub')}
            onBackToTranscript={() => setStage('transcript')}
          />
        )}

        {project.currentStage === 'dub' && (
          <DubVoiceStep
            project={project}
            videoBlob={videoBlob}
            ttsAudioBlob={ttsAudioBlob}
            onSaveTtsAudio={saveTtsAudio}
            onUpdateAudioSettings={updateAudioSettings}
            onUpdateSubtitleSettings={updateSubtitleSettings}
            onProceedToExport={() => setStage('export')}
            onBackToTranslate={() => setStage('translate')}
          />
        )}

        {project.currentStage === 'export' && (
          <ExportStep
            project={project}
            videoBlob={videoBlob}
            ttsAudioBlob={ttsAudioBlob}
            exportedVideoBlob={exportedVideoBlob}
            onSaveExportedVideo={saveExportedVideo}
            onClearProject={handleClearProjectConfirm}
            onBackToDub={() => setStage('dub')}
          />
        )}
      </main>

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        currentApiKey={project.apiKey}
        onSaveApiKey={setApiKey}
      />
    </div>
  );
};

export default App;
