import React, { useState, useRef, useEffect } from 'react';
import { Camera, SwitchCamera, CircleDot, Square, RefreshCw, ArrowRight } from 'lucide-react';
import { CameraRecorderService } from '../../services/camera/cameraRecorder';
import { VideoPlayer } from '../common/VideoPlayer';

interface CameraRecordStepProps {
  onVideoRecorded: (blob: Blob, duration: number, width: number, height: number) => void;
  existingVideoBlob: Blob | null;
  onProceedToTranscript: () => void;
}

export const CameraRecordStep: React.FC<CameraRecordStepProps> = ({
  onVideoRecorded,
  existingVideoBlob,
  onProceedToTranscript,
}) => {
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [micLevel, setMicLevel] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [videoPreviewBlob, setVideoPreviewBlob] = useState<Blob | null>(existingVideoBlob);
  const [recordedDuration, setRecordedDuration] = useState<number>(0);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const cameraServiceRef = useRef<CameraRecorderService>(new CameraRecorderService());

  const startCameraStream = async (mode: 'user' | 'environment') => {
    setErrorMessage(null);
    try {
      const streamInfo = await cameraServiceRef.current.startCamera(mode, (level) => {
        setMicLevel(level);
      });
      if (videoElementRef.current) {
        videoElementRef.current.srcObject = streamInfo.stream;
        videoElementRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
      setFacingMode(mode);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to access camera or microphone.');
      setIsCameraActive(false);
    }
  };

  const stopCameraStream = () => {
    cameraServiceRef.current.stopCamera();
    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsRecording(false);
    setMicLevel(0);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cameraServiceRef.current.stopCamera();
    };
  }, []);

  const handleStartRecording = () => {
    if (!isCameraActive) return;
    setIsRecording(true);
    setElapsedSec(0);

    cameraServiceRef.current.startRecording(
      (elapsed) => {
        setElapsedSec(elapsed);
      },
      (finalBlob, duration) => {
        setIsRecording(false);
        stopCameraStream();
        setVideoPreviewBlob(finalBlob);
        setRecordedDuration(duration);
        onVideoRecorded(finalBlob, duration, 720, 1280);
      }
    );
  };

  const handleStopRecording = () => {
    cameraServiceRef.current.stopRecording();
  };

  const handleFlipCamera = () => {
    if (isRecording) return;
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    startCameraStream(nextMode);
  };

  const handleRetake = () => {
    setVideoPreviewBlob(null);
    startCameraStream(facingMode);
  };

  const formatTimer = (sec: number) => {
    const s = Math.floor(sec);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Intro card if not opened yet and no recording exists */}
      {!isCameraActive && !videoPreviewBlob && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '36px 20px' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'var(--grad-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <Camera size={36} color="#ffffff" />
          </div>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Record Gujarati Video</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
            Speak in natural Gujarati for up to <strong>30 seconds</strong>. Your video will be converted into high-quality Hindi or English dubbing.
          </p>

          <button
            type="button"
            className="btn btn-record"
            style={{ width: '100%', maxWidth: '300px', fontSize: '1.05rem', padding: '14px 24px' }}
            onClick={() => startCameraStream('user')}
          >
            <CircleDot size={20} />
            Start Camera (New Video)
          </button>
        </div>
      )}

      {/* Error state */}
      {errorMessage && (
        <div
          className="glass-card"
          style={{
            borderColor: 'var(--accent-rose)',
            background: 'rgba(244, 63, 94, 0.1)',
            color: 'var(--text-primary)',
          }}
        >
          <h4 style={{ color: 'var(--accent-rose)', margin: '0 0 6px 0' }}>Camera Access Required</h4>
          <p style={{ fontSize: '0.85rem', margin: '0 0 12px 0' }}>{errorMessage}</p>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            onClick={() => startCameraStream('user')}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Active Camera Viewfinder */}
      {isCameraActive && (
        <div className="camera-container">
          <video
            ref={videoElementRef}
            playsInline
            muted
            autoPlay
            className="camera-video"
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
          />

          {/* Camera Controls Overlay */}
          <div className="camera-overlay">
            {/* Top Bar: Timer & Camera Flip */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div
                style={{
                  background: isRecording ? 'rgba(244, 63, 94, 0.85)' : 'rgba(15, 23, 42, 0.75)',
                  backdropFilter: 'blur(8px)',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontFamily: 'monospace',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: isRecording ? '1px solid rgba(255,255,255,0.4)' : '1px solid var(--border-glass)',
                }}
              >
                {isRecording && (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      animation: 'pulseGlow 1s infinite',
                    }}
                  />
                )}
                <span>{formatTimer(elapsedSec)}</span>
                <span style={{ opacity: 0.6 }}>/ 00:30</span>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-icon"
                onClick={handleFlipCamera}
                disabled={isRecording}
                title="Flip Camera (Front/Rear)"
                aria-label="Flip Camera"
                style={{ opacity: isRecording ? 0.4 : 1 }}
              >
                <SwitchCamera size={20} />
              </button>
            </div>

            {/* Bottom Bar: Mic Meter & Record Trigger */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
              {/* Real-time Microphone Meter */}
              <div style={{ width: '100%', maxWidth: '200px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#ffffff', marginBottom: '3px' }}>
                  <span>Mic Level</span>
                  <span>{micLevel}%</span>
                </div>
                <div className="audio-meter-bar">
                  <div
                    className="audio-meter-fill"
                    style={{
                      width: `${micLevel}%`,
                      background: micLevel > 70 ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                    }}
                  />
                </div>
              </div>

              {/* Record Button */}
              {!isRecording ? (
                <button
                  type="button"
                  className="btn btn-record animate-pulse-record"
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    padding: 0,
                    boxShadow: 'var(--shadow-glow-red)',
                  }}
                  onClick={handleStartRecording}
                  aria-label="Start 30-second Recording"
                >
                  <CircleDot size={36} color="#ffffff" />
                </button>
              ) : (
                <button
                  type="button"
                  className="btn"
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    padding: 0,
                    background: '#ffffff',
                    color: 'var(--accent-rose)',
                    boxShadow: 'var(--shadow-lg)',
                  }}
                  onClick={handleStopRecording}
                  aria-label="Stop Recording"
                >
                  <Square size={30} fill="currentColor" />
                </button>
              )}

              <p style={{ fontSize: '0.75rem', color: '#ffffff', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                {isRecording ? 'Tap to finish before 30s' : 'Tap to Record (Max 30s)'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recording Preview (When recorded) */}
      {!isCameraActive && videoPreviewBlob && (
        <div className="animate-slide-up">
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Original Gujarati Video</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Recorded duration: {recordedDuration ? `${recordedDuration.toFixed(1)}s` : 'Captured'}
                </span>
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                onClick={handleRetake}
              >
                <RefreshCw size={14} />
                Retake
              </button>
            </div>

            <VideoPlayer videoBlob={videoPreviewBlob} />
          </div>

          <div className="bottom-bar">
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', fontSize: '1rem', padding: '14px' }}
              onClick={onProceedToTranscript}
            >
              Transcribe Gujarati
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
