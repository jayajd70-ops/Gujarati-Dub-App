import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

class TTSPipelineSingleton {
  static instances: Record<string, any> = {};

  static async getInstance(modelId: string, progressCallback?: Function) {
    if (!this.instances[modelId]) {
      this.instances[modelId] = await pipeline('text-to-speech' as any, modelId, {
        progress_callback: progressCallback,
      });
    }
    return this.instances[modelId];
  }
}

self.addEventListener('message', async (event: MessageEvent) => {
  const { type, text, lang } = event.data;

  if (type === 'synthesize') {
    try {
      // Use Meta MMS-TTS models for Hindi and English
      const modelId = lang === 'hi' ? 'Xenova/mms-tts-hin' : 'Xenova/mms-tts-eng';

      self.postMessage({
        status: 'loading',
        message: `Initializing local neural TTS model (${lang === 'hi' ? 'Hindi' : 'English'}, variable ~30-45MB download, cached locally)...`,
      });

      const synthesizer = await TTSPipelineSingleton.getInstance(modelId, (progress: any) => {
        if (progress.status === 'progress') {
          self.postMessage({
            status: 'loading',
            progress: Math.round(progress.progress || 0),
            message: `Downloading neural voice weights: ${Math.round(progress.progress || 0)}%`,
          });
        }
      });

      self.postMessage({
        status: 'synthesizing',
        message: `Synthesizing spoken ${lang === 'hi' ? 'Hindi' : 'English'} speech...`,
      });

      const output = await synthesizer(text);

      // output contains { audio: Float32Array, sampling_rate: number }
      self.postMessage({
        status: 'done',
        message: 'Speech synthesized successfully',
        audioData: output.audio,
        sampleRate: output.sampling_rate || 16000,
      });
    } catch (error: any) {
      self.postMessage({
        status: 'error',
        message: error.message || 'Local neural TTS synthesis failed',
      });
    }
  }
});
