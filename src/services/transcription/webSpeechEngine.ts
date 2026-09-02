import { ITranscriptionEngine, ProgressCallback } from '../../types/engines';
import { TranscriptSegment } from '../../types/project';
import { decodeAudioFromBlob } from './audioUtils';

export class WebSpeechTranscriptionEngine implements ITranscriptionEngine {
  readonly id = 'webspeech';
  readonly name = 'Browser Speech Recognition (gu-IN)';
  readonly isLocal = true;

  async transcribe(
    audioBlob: Blob,
    onProgress?: ProgressCallback
  ): Promise<{
    fullText: string;
    segments: TranscriptSegment[];
  }> {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      throw new Error(
        'Web Speech API is not supported in this browser. Please use the Local Whisper engine, Gemini API, or enter transcript manually.'
      );
    }

    if (onProgress) {
      onProgress('Preparing audio', 20, 'Preparing microphone playback stream for recognition...');
    }

    const audioBuffer = await decodeAudioFromBlob(audioBlob);
    const duration = audioBuffer.duration;

    return new Promise((resolve, reject) => {
      const recognition = new SpeechRecognition();
      recognition.lang = 'gu-IN';
      recognition.continuous = true;
      recognition.interimResults = false;

      let transcript = '';
      const segments: TranscriptSegment[] = [];

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      let isFinished = false;
      const finish = () => {
        if (isFinished) return;
        isFinished = true;
        recognition.stop();
        audio.pause();
        URL.revokeObjectURL(audioUrl);

        const cleanTranscript = transcript.trim();
        if (!cleanTranscript) {
          if (onProgress) onProgress('Recognition failed', 100, 'No speech was detected');
          reject(
            new Error(
              'No Gujarati speech was detected by the browser recognizer. Please record again or type the transcript manually.'
            )
          );
          return;
        }

        if (onProgress) onProgress('Transcript ready', 100, 'Recognition completed');
        resolve({
          fullText: cleanTranscript,
          segments:
            segments.length > 0
              ? segments
              : [
                  {
                    id: `seg_0_${Date.now()}`,
                    start: 0,
                    end: Math.min(30, duration),
                    text: cleanTranscript,
                  },
                ],
        });
      };

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const piece = event.results[i][0].transcript;
            transcript += ' ' + piece;
            const currentT = audio.currentTime || 0;
            segments.push({
              id: `seg_${segments.length}_${Date.now()}`,
              start: Math.max(0, currentT - 3),
              end: Math.min(duration, currentT),
              text: piece.trim(),
            });
          }
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('SpeechRecognition warning:', e.error);
        if (e.error === 'no-speech' || e.error === 'network') {
          return;
        }
        finish();
      };

      audio.onended = () => {
        setTimeout(finish, 800);
      };

      recognition.onstart = () => {
        if (onProgress) onProgress('Transcribing', 60, 'Listening to Gujarati audio track...');
        audio.play().catch(() => {
          finish();
        });
      };

      try {
        recognition.start();
      } catch (err: any) {
        reject(new Error(`Failed to start speech recognition: ${err.message || 'Unknown error'}`));
      }
    });
  }
}
