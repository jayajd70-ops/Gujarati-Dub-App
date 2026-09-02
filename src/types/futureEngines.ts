/**
 * Future capability interfaces reserved for V2 milestones.
 * (Not implemented in 30-second Trial Mode).
 */

export interface IVoiceCloneEngine {
  readonly id: string;
  readonly name: string;
  extractSpeakerEmbedding(audioBlob: Blob): Promise<Float32Array>;
  synthesizeClonedVoice(text: string, embedding: Float32Array): Promise<Blob>;
}

export interface ISpeakerDiarizationEngine {
  readonly id: string;
  readonly name: string;
  diarize(audioBlob: Blob): Promise<Array<{ speakerId: string; start: number; end: number }>>;
}

export interface ISourceSeparationEngine {
  readonly id: string;
  readonly name: string;
  separate(audioBlob: Blob): Promise<{ vocals: Blob; background: Blob }>;
}

export interface ILipSyncEngine {
  readonly id: string;
  readonly name: string;
  generateLipSync(videoBlob: Blob, targetAudioBlob: Blob): Promise<Blob>;
}

export interface ILiveDubEngine {
  readonly id: string;
  readonly name: string;
  startLiveDub(stream: MediaStream, targetLang: string): Promise<MediaStream>;
}
