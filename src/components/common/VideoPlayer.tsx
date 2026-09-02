import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { TranslatedSegment, SubtitleSettings, AudioSettings } from '../../types/project';
import { SubtitleEngine } from '../../services/subtitles/subtitleEngine';

interface VideoPlayerProps {
  videoBlob: Blob | null;
  ttsAudioBlob?: Blob | null;
  isDubbedPreview?: boolean;
  subtitles?: TranslatedSegment[];
  subtitleSettings?: SubtitleSettings;
  audioSettings?: AudioSettings;
  posterTitle?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoBlob,
  ttsAudioBlob,
  isDubbedPreview = false,
  subtitles = [],
  subtitleSettings,
  audioSettings,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string>('');

  // Setup video URL
  useEffect(() => {
    if (!videoBlob) {
      setVideoUrl('');
      return;
    }
    const url = URL.createObjectURL(videoBlob);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoBlob]);

  // Setup audio URL for dubbing preview
  useEffect(() => {
    if (!ttsAudioBlob || !isDubbedPreview) {
      setAudioUrl('');
      return;
    }
    const url = URL.createObjectURL(ttsAudioBlob);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [ttsAudioBlob, isDubbedPreview]);

  // Subtitle engine instance
  const subtitleEngine = useRef(new SubtitleEngine());

  // Handle time updates & subtitle sync
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);

    if (subtitleSettings?.enabled && subtitles.length > 0) {
      const { getActiveSubtitle } = subtitleEngine.current.generateSubtitles(
        subtitles,
        videoRef.current.duration || 30
      );
      setActiveSubtitle(getActiveSubtitle(t));
    } else {
      setActiveSubtitle(null);
    }
  };

  // Sync audio with video volume and play state
  useEffect(() => {
    if (!videoRef.current) return;

    if (isDubbedPreview && audioSettings) {
      videoRef.current.volume = audioSettings.isOriginalMuted ? 0 : audioSettings.originalAudioVolume;
    } else {
      videoRef.current.volume = 1.0;
    }

    if (audioRef.current && isDubbedPreview && audioSettings) {
      audioRef.current.volume = Math.min(1.0, audioSettings.dubbedAudioVolume);
    }
  }, [isDubbedPreview, audioSettings]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current && isDubbedPreview) {
        audioRef.current.currentTime = videoRef.current.currentTime;
        audioRef.current.play().catch(() => {});
      }
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newT = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newT;
      setCurrentTime(newT);
      if (audioRef.current && isDubbedPreview) {
        audioRef.current.currentTime = newT;
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (audioRef.current) audioRef.current.pause();
  };

  if (!videoBlob) {
    return (
      <div className="camera-container" style={{ maxHeight: '380px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No video recorded yet</p>
      </div>
    );
  }

  const formatTime = (secs: number) => {
    const s = Math.floor(secs);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  };

  const fontSizes = { sm: '0.85rem', md: '1.05rem', lg: '1.25rem' };

  return (
    <div className="camera-container" style={{ maxHeight: '460px' }}>
      <video
        ref={videoRef}
        src={videoUrl}
        playsInline
        className="camera-video"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onEnded={handleEnded}
        onClick={togglePlay}
      />

      {audioUrl && isDubbedPreview && (
        <audio ref={audioRef} src={audioUrl} style={{ display: 'none' }} />
      )}

      {/* Subtitle Pill Overlay */}
      {subtitleSettings?.enabled && activeSubtitle && (
        <div
          style={{
            position: 'absolute',
            bottom: '72px',
            left: '12px',
            right: '12px',
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.9)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              padding: '6px 14px',
              color: '#ffffff',
              fontSize: fontSizes[subtitleSettings.fontSize || 'md'],
              fontWeight: 600,
              textAlign: 'center',
              fontFamily: '"Noto Sans Devanagari", "Noto Sans Gujarati", "Inter", sans-serif',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              maxWidth: '90%',
            }}
          >
            {activeSubtitle}
          </div>
        </div>
      )}

      {/* Player Controls Bar */}
      <div
        className="camera-overlay"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)',
          justifyContent: 'flex-end',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Progress Slider */}
          <input
            type="range"
            min="0"
            max={duration || 30}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="slider-input"
            style={{ height: '5px' }}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-icon"
                style={{ width: '36px', height: '36px' }}
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>

              <span style={{ fontSize: '0.8rem', color: '#ffffff', fontFamily: 'monospace' }}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isDubbedPreview && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(56, 189, 248, 0.25)',
                    color: 'var(--accent-cyan)',
                    fontWeight: 600,
                  }}
                >
                  Dubbed Audio
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
