import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react';
import { ProjectData, AudioSettings, SubtitleSettings } from '../../types/project';
import { TTSService } from '../../services/tts/ttsEngine';
import { AudioTimingEngine } from '../../services/tts/audioTimingEngine';
import { VideoPlayer } from '../common/VideoPlayer';
import { AudioLevelControl } from '../common/AudioLevelControl';
import { SubtitleControl } from '../common/SubtitleOverlay';
import { LoadingIndicator } from '../common/LoadingIndicator';

interface DubVoiceStepProps {
  project: ProjectData;
  videoBlob: Blob | null;
  ttsAudioBlob: Blob | null;
  onSaveTtsAudio: (blob: Blob, duration: number) => void;
  onUpdateAudioSettings: (settings: Partial<AudioSettings>) => void;
  onUpdateSubtitleSettings: (settings: Partial<SubtitleSettings>) => void;
  onProceedToExport: () => void;
  onBackToTranslate: () => void;
}

export const DubVoiceStep: React.FC<DubVoiceStepProps> = ({
  project,
  videoBlob,
  ttsAudioBlob,
  onSaveTtsAudio,
  onUpdateAudioSettings,
  onUpdateSubtitleSettings,
  onProceedToExport,
  onBackToTranslate,
}) => {
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timingWarning, setTimingWarning] = useState<string | null>(null);

  const generateVoice = async () => {
    if (!project.translatedText) {
      setErrorMessage('No translated text available to synthesize.');
      return;
    }

    setIsSynthesizing(true);
    setErrorMessage(null);
    setTimingWarning(null);

    // Check timing fit
    const timing = AudioTimingEngine.alignSegments(
      project.translatedSegments,
      project.videoDuration || 30
    );
    if (timing.hasWarning && timing.warningMessage) {
      setTimingWarning(timing.warningMessage);
    }

    try {
      const result = await TTSService.generateSpeech(
        project.translatedText,
        project.targetLanguage,
        project.translatedSegments,
        project.videoDuration || 30,
        project.apiKey
      );

      onSaveTtsAudio(result.audioBlob, result.duration);
    } catch (err: any) {
      setErrorMessage(err.message || 'Voice synthesis failed. Please try again.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Generate on mount if not already present
  useEffect(() => {
    if (!ttsAudioBlob && project.translatedText) {
      generateVoice();
    }
  }, [project.translatedText, project.targetLanguage]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Dubbed Video Preview Player */}
      <div className="glass-card" style={{ padding: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem' }}>
              Dubbed Preview ({project.targetLanguage === 'hi' ? 'Hindi' : 'English'})
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Synchronized speech + subtitle overlay
            </span>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            onClick={generateVoice}
            disabled={isSynthesizing}
          >
            <RefreshCw size={13} />
            Regenerate Voice
          </button>
        </div>

        <VideoPlayer
          videoBlob={videoBlob}
          ttsAudioBlob={ttsAudioBlob}
          isDubbedPreview={true}
          subtitles={project.translatedSegments}
          subtitleSettings={project.subtitleSettings}
          audioSettings={project.audioSettings}
        />
      </div>

      {/* Loading state */}
      {isSynthesizing && (
        <LoadingIndicator
          stage={`Generating ${project.targetLanguage === 'hi' ? 'Hindi' : 'English'} Voice Track`}
          message="Synthesizing exportable audio with natural timing and pauses..."
        />
      )}

      {/* Timing Warning if translated text is long */}
      {timingWarning && (
        <div
          className="glass-card"
          style={{
            borderColor: 'var(--accent-amber)',
            background: 'rgba(245, 158, 11, 0.1)',
            padding: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-amber)' }}>
            <AlertTriangle size={18} />
            <strong style={{ fontSize: '0.85rem' }}>Timing Fit Notice</strong>
          </div>
          <p style={{ fontSize: '0.8rem', margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
            {timingWarning}
          </p>
        </div>
      )}

      {/* Error state */}
      {errorMessage && (
        <div className="glass-card" style={{ borderColor: 'var(--accent-rose)', background: 'rgba(244, 63, 94, 0.1)' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--accent-rose)', margin: 0 }}>{errorMessage}</p>
        </div>
      )}

      {/* Audio Mixing Controls */}
      <AudioLevelControl
        settings={project.audioSettings}
        onChange={onUpdateAudioSettings}
      />

      {/* Subtitle Configuration */}
      <SubtitleControl
        settings={project.subtitleSettings}
        onChange={onUpdateSubtitleSettings}
      />

      {/* Bottom Navigation */}
      <div className="bottom-bar">
        <button
          type="button"
          className="btn btn-secondary"
          style={{ flex: 1 }}
          onClick={onBackToTranslate}
          disabled={isSynthesizing}
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <button
          type="button"
          className="btn btn-primary"
          style={{ flex: 2 }}
          onClick={onProceedToExport}
          disabled={!ttsAudioBlob || isSynthesizing}
        >
          Proceed to Export
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
