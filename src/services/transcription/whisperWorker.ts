import { pipeline, env } from '@xenova/transformers';

// Configure transformers.js for browser environment
env.allowLocalModels = false;
env.useBrowserCache = true;

class WhisperPipelineSingleton {
  static task = 'automatic-speech-recognition';
  static model = 'Xenova/whisper-small';
  static instance: any = null;

  static async getInstance(progressCallback?: Function) {
    if (this.instance === null) {
      this.instance = await pipeline(this.task as any, this.model, {
        progress_callback: progressCallback,
      });
    }
    return this.instance;
  }
}

self.addEventListener('message', async (event: MessageEvent) => {
  const { type, audioData } = event.data;

  if (type === 'transcribe') {
    try {
      self.postMessage({
        status: 'loading',
        message: 'Loading speech model (approx 244MB, first time only - cached after)...',
      });

      const transcriber = await WhisperPipelineSingleton.getInstance((progress: any) => {
        if (progress.status === 'progress') {
          self.postMessage({
            status: 'loading',
            progress: Math.round(progress.progress || 0),
            message: `Downloading model weights: ${Math.round(progress.progress || 0)}%`,
          });
        }
      });

      self.postMessage({
        status: 'transcribing',
        message: 'Transcribing Gujarati audio...',
      });

      // Transcribe audio Float32Array (16kHz) specifically in Gujarati
      const output = await transcriber(audioData, {
        language: 'gujarati',
        task: 'transcribe',
        return_timestamps: true,
        chunk_length_s: 30,
        stride_length_s: 5,
        temperature: 0.0,
      });

      self.postMessage({
        status: 'done',
        message: 'Transcript ready',
        result: output,
      });
    } catch (error: any) {
      self.postMessage({
        status: 'error',
        message: error.message || 'Transcription failed',
      });
    }
  }
});
