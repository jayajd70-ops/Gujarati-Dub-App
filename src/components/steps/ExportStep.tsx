import React, { useState } from 'react';
import { Share2, ArrowLeft, Trash2, CheckCircle2, Film, AlertCircle, Info } from 'lucide-react';
import { ProjectData } from '../../types/project';
import { VideoExportEngine } from '../../services/render/videoExportEngine';
import { VideoPlayer } from '../common/VideoPlayer';
import { LoadingIndicator } from '../common/LoadingIndicator';

interface ExportStepProps {
  project: ProjectData;
  videoBlob: Blob | null;
  ttsAudioBlob: Blob | null;
  exportedVideoBlob: Blob | null;
  onSaveExportedVideo: (blob: Blob) => void;
  onClearProject: () => void;
  onBackToDub: () => void;
}

export const ExportStep: React.FC<ExportStepProps> = ({
  project,
  videoBlob,
  ttsAudioBlob,
  exportedVideoBlob,
  onSaveExportedVideo,
  onClearProject,
  onBackToDub,
}) => {
  const [activePreviewTab, setActivePreviewTab] = useState<'dubbed' | 'original'>('dubbed');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<{ percent: number; status: string }>({
    percent: 0,
    status: '',
  });
  const [exportedFilename, setExportedFilename] = useState<string>('');
  const [exportedContainerInfo, setExportedContainerInfo] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const langLabel = project.targetLanguage === 'hi' ? 'Hindi' : 'English';

  const runVideoExport = async () => {
    if (!videoBlob || !ttsAudioBlob) {
      setErrorMessage('Missing video or audio data for export.');
      return;
    }

    setIsExporting(true);
    setErrorMessage(null);

    try {
      const exportEngine = new VideoExportEngine();
      const result = await exportEngine.exportVideo({
        videoBlob,
        ttsAudioBlob,
        subtitles: project.translatedSegments,
        subtitleSettings: project.subtitleSettings,
        audioSettings: project.audioSettings,
        targetLang: project.targetLanguage,
        onProgress: (percent, status) => {
          setExportProgress({ percent, status });
        },
      });

      setExportedFilename(result.filename);
      setExportedContainerInfo(result.containerInfo);
      onSaveExportedVideo(result.videoBlob);
    } catch (err: any) {
      setErrorMessage(err.message || 'Video export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    if (!exportedVideoBlob) return;
    const filename = exportedFilename || `Gujarati-Dub-Studio-${langLabel}.mp4`;
    await VideoExportEngine.shareOrDownload(
      exportedVideoBlob,
      filename,
      `Gujarati Dub Studio - ${langLabel} Video`
    );
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Tabbed Comparison Preview */}
      <div className="glass-card" style={{ padding: '14px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <button
            type="button"
            className={`btn ${activePreviewTab === 'dubbed' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
            onClick={() => setActivePreviewTab('dubbed')}
          >
            ▶ Dubbed Preview ({langLabel})
          </button>
          <button
            type="button"
            className={`btn ${activePreviewTab === 'original' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
            onClick={() => setActivePreviewTab('original')}
          >
            Original Gujarati
          </button>
        </div>

        {activePreviewTab === 'dubbed' ? (
          <VideoPlayer
            videoBlob={exportedVideoBlob || videoBlob}
            ttsAudioBlob={exportedVideoBlob ? undefined : ttsAudioBlob}
            isDubbedPreview={!exportedVideoBlob}
            subtitles={project.translatedSegments}
            subtitleSettings={project.subtitleSettings}
            audioSettings={project.audioSettings}
          />
        ) : (
          <VideoPlayer videoBlob={videoBlob} />
        )}
      </div>

      {/* Summary Details */}
      <div className="glass-card" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
          Dubbing Summary
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Target Language:</span>
            <strong style={{ color: 'var(--accent-cyan)' }}>{langLabel}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Burned Subtitles:</span>
            <span>{project.subtitleSettings.enabled ? `Enabled (${project.subtitleSettings.fontSize.toUpperCase()})` : 'Disabled'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Audio Mix:</span>
            <span>
              {project.audioSettings.isOriginalMuted
                ? 'Original Muted + 100% Dubbed Speech'
                : `${Math.round(project.audioSettings.originalAudioVolume * 100)}% Original + ${Math.round(project.audioSettings.dubbedAudioVolume * 100)}% Dubbed Speech`}
            </span>
          </div>
        </div>
      </div>

      {/* Export progress loading */}
      {isExporting && (
        <LoadingIndicator
          stage="Rendering Final Video"
          message={exportProgress.status}
          progress={exportProgress.percent}
        />
      )}

      {/* Error state */}
      {errorMessage && (
        <div className="glass-card" style={{ borderColor: 'var(--accent-rose)', background: 'rgba(244, 63, 94, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-rose)' }}>
            <AlertCircle size={18} />
            <p style={{ margin: 0, fontSize: '0.85rem' }}>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Success / Download Card */}
      {exportedVideoBlob && !isExporting && (
        <div
          className="glass-card animate-slide-up"
          style={{
            borderColor: 'var(--accent-emerald)',
            background: 'rgba(16, 185, 129, 0.08)',
            textAlign: 'center',
            padding: '20px',
          }}
        >
          <CheckCircle2 size={36} color="var(--accent-emerald)" style={{ margin: '0 auto 10px' }} />
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem' }}>Video Export Complete!</h3>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
            {exportedFilename}
          </p>

          {exportedContainerInfo && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginBottom: '16px',
                background: 'rgba(255,255,255,0.05)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              <Info size={13} />
              <span>Container: {exportedContainerInfo}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 1, padding: '12px' }}
              onClick={handleShare}
            >
              <Share2 size={18} />
              Share / Save Video
            </button>
          </div>
        </div>
      )}

      {/* Main Export Trigger if not yet exported */}
      {!exportedVideoBlob && !isExporting && (
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: '100%', padding: '16px', fontSize: '1.05rem', boxShadow: 'var(--shadow-glow)' }}
          onClick={runVideoExport}
        >
          <Film size={20} />
          Render & Export {langLabel} Video
        </button>
      )}

      {/* Clear Project Option */}
      <div style={{ textAlign: 'center', marginTop: '10px' }}>
        <button
          type="button"
          className="btn btn-danger"
          style={{ padding: '8px 16px', fontSize: '0.8rem' }}
          onClick={onClearProject}
        >
          <Trash2 size={14} />
          Delete Recording / Clear Project
        </button>
      </div>

      {/* Bottom Navigation */}
      <div className="bottom-bar">
        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: '100%' }}
          onClick={onBackToDub}
          disabled={isExporting}
        >
          <ArrowLeft size={18} />
          Back to Voice & Subtitles
        </button>
      </div>
    </div>
  );
};
