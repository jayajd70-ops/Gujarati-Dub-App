import { IVideoExportEngine } from '../../types/engines';
import { ProjectData, TranslatedSegment } from '../../types/project';
import { SubtitleEngine } from '../subtitles/subtitleEngine';
import { AudioMixerService } from './audioMixer';

export class VideoExportEngine implements IVideoExportEngine {
  async exportVideo(params: {
    videoBlob: Blob;
    ttsAudioBlob: Blob;
    subtitles: TranslatedSegment[];
    subtitleSettings: ProjectData['subtitleSettings'];
    audioSettings: ProjectData['audioSettings'];
    targetLang?: 'hi' | 'en';
    onProgress?: (percent: number, status: string) => void;
  }): Promise<{
    videoBlob: Blob;
    mimeType: string;
    extension: 'mp4' | 'webm';
    filename: string;
    containerInfo: string;
  }> {
    const { videoBlob, ttsAudioBlob, subtitles, subtitleSettings, audioSettings, targetLang, onProgress } = params;

    if (onProgress) onProgress(5, 'Preparing video and audio rendering graph...');

    // 1. Create video element to decode and play source video frames
    const videoUrl = URL.createObjectURL(videoBlob);
    const video = document.createElement('video');
    video.src = videoUrl;
    video.playsInline = true;
    video.muted = true; // Audio is routed directly through Web Audio mixer

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Failed to load video metadata for export'));
    });

    const videoDuration = Math.min(30, video.duration || 30);
    const width = video.videoWidth || 720;
    const height = video.videoHeight || 1280;

    // 2. Prepare Canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not create Canvas rendering context');

    // 3. Prepare Audio Mixer Stream (Original track + Dubbed voice track)
    const { audioStream, startSources, stopSources } = await AudioMixerService.createMixStream(
      videoBlob,
      ttsAudioBlob,
      audioSettings,
      videoDuration
    );

    // 4. Capture Canvas stream (30fps)
    const canvasStream = canvas.captureStream(30);
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioStream.getAudioTracks(),
    ]);

    // 5. Test real browser codec support
    const formatCandidates = [
      { mime: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', ext: 'mp4' as const, desc: 'MP4 (H.264 Baseline / AAC)' },
      { mime: 'video/mp4;codecs=avc1,mp4a.40.2', ext: 'mp4' as const, desc: 'MP4 (H.264 / AAC)' },
      { mime: 'video/mp4', ext: 'mp4' as const, desc: 'MP4 Container' },
      { mime: 'video/webm;codecs=vp9,opus', ext: 'webm' as const, desc: 'WebM (VP9 / Opus)' },
      { mime: 'video/webm;codecs=vp8,opus', ext: 'webm' as const, desc: 'WebM (VP8 / Opus)' },
      { mime: 'video/webm', ext: 'webm' as const, desc: 'WebM Container' },
    ];

    let selectedMime = 'video/webm';
    let selectedExt: 'mp4' | 'webm' = 'webm';
    let containerInfo = 'WebM (Standard)';

    for (const fmt of formatCandidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(fmt.mime)) {
        selectedMime = fmt.mime;
        selectedExt = fmt.ext;
        containerInfo = fmt.desc;
        break;
      }
    }

    if (onProgress) onProgress(15, `Rendering video frames (${containerInfo})...`);

    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(combinedStream, {
      mimeType: selectedMime,
      videoBitsPerSecond: 2500000, // 2.5 Mbps
    });

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    const subtitleEngine = new SubtitleEngine();
    const { getActiveSubtitle } = subtitleEngine.generateSubtitles(subtitles, videoDuration);

    let isRendering = true;
    let animId: number | null = null;

    const renderLoop = () => {
      if (!isRendering) return;

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, width, height);

      // Burn subtitles into the canvas frame if enabled
      if (subtitleSettings.enabled) {
        const activeSub = getActiveSubtitle(video.currentTime);
        if (activeSub) {
          SubtitleEngine.renderSubtitleOnCanvas(
            ctx,
            activeSub,
            width,
            height,
            subtitleSettings.fontSize
          );
        }
      }

      const progressPercent = Math.min(95, 15 + Math.round((video.currentTime / videoDuration) * 80));
      if (onProgress) {
        onProgress(
          progressPercent,
          `Exporting: ${Math.round(video.currentTime)}s / ${Math.round(videoDuration)}s (${selectedExt.toUpperCase()})`
        );
      }

      animId = requestAnimationFrame(renderLoop);
    };

    return new Promise((resolve, reject) => {
      recorder.onstop = () => {
        isRendering = false;
        if (animId) cancelAnimationFrame(animId);
        stopSources();
        video.pause();
        URL.revokeObjectURL(videoUrl);

        if (onProgress) onProgress(100, 'Video export complete!');

        const finalBlob = new Blob(chunks, { type: selectedMime });

        // Standardized filename with genuine extension: Gujarati-Dub-Studio-Hindi-YYYYMMDD-HHmm.[mp4|webm]
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const langStr = targetLang === 'hi' ? 'Hindi' : 'English';
        const filename = `Gujarati-Dub-Studio-${langStr}-${yyyy}${mm}${dd}-${hh}${min}.${selectedExt}`;

        resolve({
          videoBlob: finalBlob,
          mimeType: selectedMime,
          extension: selectedExt,
          filename,
          containerInfo,
        });
      };

      recorder.onerror = (err) => {
        isRendering = false;
        if (animId) cancelAnimationFrame(animId);
        stopSources();
        URL.revokeObjectURL(videoUrl);
        reject(err);
      };

      // Start recording & playback
      recorder.start(250);
      startSources();
      video.play().then(() => {
        renderLoop();
      }).catch((e) => {
        reject(new Error('Video playback error during export: ' + e.message));
      });

      video.onended = () => {
        setTimeout(() => {
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
        }, 300);
      };
    });
  }

  /**
   * Triggers native mobile Share sheet or fallback file download.
   */
  static async shareOrDownload(blob: Blob, filename: string, title: string = 'Gujarati Dub Studio Video') {
    const file = new File([blob], filename, { type: blob.type });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: title,
          text: 'Dubbed video created with Gujarati Dub Studio',
        });
        return { shared: true };
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return { cancelled: true };
        }
      }
    }

    // Browser fallback download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { downloaded: true };
  }
}
