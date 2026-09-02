import { CameraStreamInfo } from '../../types/engines';

export class CameraRecorderService {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private recordedChunks: Blob[] = [];
  private timerInterval: number | null = null;
  private startTime: number = 0;
  private durationSeconds: number = 0;

  async startCamera(
    facingMode: 'user' | 'environment' = 'user',
    onVolumeChange?: (level: number) => void
  ): Promise<CameraStreamInfo> {
    this.stopCamera();

    // 1. Strict Secure Context Check
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      throw new Error(
        'Camera & Microphone access is blocked: This page is not running in a Secure Context (HTTPS or localhost). If testing on a mobile device over LAN, you must use an HTTPS URL (e.g., https://<LAN-IP>:5173/) or enable Chrome flag "unsafely-treat-insecure-origin-as-secure".'
      );
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(
        'navigator.mediaDevices.getUserMedia is unavailable in this browser environment. Ensure HTTPS is active and camera permissions are allowed.'
      );
    }

    const constraintAttempts = [
      // Primary target: 720p @ 30fps portrait/landscape
      {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 720 },
          height: { ideal: 1280 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      },
      // Fallback 1: 480p standard
      {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 480 },
          height: { ideal: 854 },
        },
        audio: true,
      },
      // Fallback 2: Basic video + audio
      {
        video: { facingMode: facingMode },
        audio: true,
      },
      // Fallback 3: Generic
      {
        video: true,
        audio: true,
      },
    ];

    let stream: MediaStream | null = null;
    let lastError: any = null;

    for (const constraints of constraintAttempts) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (stream) break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!stream) {
      throw new Error(
        lastError?.message || 'Could not access camera/microphone. Please ensure permissions are granted.'
      );
    }

    this.mediaStream = stream;

    // Attach AudioContext Analyser for real-time microphone volume metering
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx && onVolumeChange) {
        this.audioContext = new AudioCtx();
        const source = this.audioContext.createMediaStreamSource(stream);
        this.analyserNode = this.audioContext.createAnalyser();
        this.analyserNode.fftSize = 256;
        source.connect(this.analyserNode);

        const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
        const checkVolume = () => {
          if (!this.analyserNode) return;
          this.analyserNode.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          // Scale to 0-100
          const level = Math.min(100, Math.round((avg / 128) * 100));
          onVolumeChange(level);
          this.animFrameId = requestAnimationFrame(checkVolume);
        };
        checkVolume();
      }
    } catch (e) {
      console.warn('Audio metering init error (harmless):', e);
    }

    const videoTrack = stream.getVideoTracks()[0];
    const settings = videoTrack ? videoTrack.getSettings() : {};

    return {
      stream,
      actualWidth: settings.width || 720,
      actualHeight: settings.height || 1280,
      actualFps: settings.frameRate || 30,
      facingMode: (settings.facingMode as any) || facingMode,
    };
  }

  startRecording(
    onTick: (elapsedSec: number, remainingSec: number) => void,
    onMaxLimitReached: (blob: Blob, duration: number) => void
  ): void {
    if (!this.mediaStream) {
      throw new Error('Camera is not active');
    }

    this.recordedChunks = [];
    this.startTime = Date.now();
    const MAX_DURATION_SEC = 30;

    // Detect optimal supported mimeType
    // WebM first: MediaRecorder's chunked MP4 output is well known to be
    // unreliable when later re-decoded by the browser's Web Audio decoder
    // (decodeAudioData often returns silent/garbled audio instead of
    // throwing, which then feeds transcription engines near-silence and
    // produces hallucinated/looping output). WebM's chunks reassemble
    // reliably. MP4 stays as a fallback for browsers (mainly iOS Safari)
    // that don't support WebM recording at all.
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4',
    ];
    let selectedMimeType = '';
    for (const mime of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mime)) {
        selectedMimeType = mime;
        break;
      }
    }

    const options: MediaRecorderOptions = selectedMimeType ? { mimeType: selectedMimeType } : {};
    this.mediaRecorder = new MediaRecorder(this.mediaStream, options);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      const mime = this.mediaRecorder?.mimeType || selectedMimeType || 'video/webm';
      const finalBlob = new Blob(this.recordedChunks, { type: mime });
      this.durationSeconds = Math.min(MAX_DURATION_SEC, (Date.now() - this.startTime) / 1000);
      onMaxLimitReached(finalBlob, this.durationSeconds);
    };

    // Request data in chunks of 500ms
    this.mediaRecorder.start(500);

    // Start precise timer
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = window.setInterval(() => {
      const elapsed = (Date.now() - this.startTime) / 1000;
      const remaining = Math.max(0, MAX_DURATION_SEC - elapsed);
      onTick(Math.min(MAX_DURATION_SEC, elapsed), remaining);

      if (elapsed >= MAX_DURATION_SEC) {
        this.stopRecording();
      }
    }, 100);
  }

  stopRecording(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  stopCamera(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
      this.analyserNode = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.mediaRecorder = null;
  }
}
