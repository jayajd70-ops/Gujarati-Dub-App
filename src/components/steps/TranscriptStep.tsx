import React, { useState, useEffect } from 'react';
import { FileText, ArrowRight, ArrowLeft, RefreshCw, Sparkles, Cpu, Globe, AlertCircle, CheckCircle2, Edit3 } from 'lucide-react';
import { ProjectData, TranscriptSegment } from '../../types/project';
import { TranscriptionService } from '../../services/transcription/transcriptionEngine';
import { validateGujaratiTranscript, ValidationResult } from '../../utils/textValidation';
import { LoadingIndicator } from '../common/LoadingIndicator';
import { VideoPlayer } from '../common/VideoPlayer';

interface TranscriptStepProps {
  project: ProjectData;
  videoBlob: Blob | null;
  onUpdateTranscript: (transcript: string, segments: TranscriptSegment[]) => void;
  onProceedToTranslate: () => void;
  onBackToRecord: () => void;
}

export const TranscriptStep: React.FC<TranscriptStepProps> = ({
  project,
  videoBlob,
  onUpdateTranscript,
  onProceedToTranslate,
  onBackToRecord,
}) => {
  const [selectedEngine, setSelectedEngine] = useState<'whisper' | 'webspeech' | 'gemini'>(
    project.apiKey ? 'gemini' : 'whisper'
  );
  const [transcriptText, setTranscriptText] = useState<string>(project.gujaratiTranscript || '');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressState, setProgressState] = useState<{ stage: string; percent?: number; message?: string }>({
    stage: '',
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult>(() =>
    validateGujaratiTranscript(project.gujaratiTranscript)
  );

  // Tracks whether the current transcript text came from a successful automatic
  // recognition pass ('auto') or was typed/edited by hand ('manual'/'none').
  // Manually entered or edited text has NOT been checked against the actual
  // recording -- it only passed a script-format check (Gujarati characters
  // present), which is not the same as matching what was said. We require an
  // explicit human confirmation before such text can be used for dubbing.
  const [transcriptSource, setTranscriptSource] = useState<'auto' | 'manual' | 'none'>(
    project.gujaratiTranscript ? 'manual' : 'none'
  );
  const [manualConfirmed, setManualConfirmed] = useState<boolean>(false);

  useEffect(() => {
    setValidation(validateGujaratiTranscript(transcriptText));
  }, [transcriptText]);

  const providerNames = {
    whisper: 'Local Neural Whisper (Client-Side)',
    webspeech: 'Browser Speech Recognition (gu-IN)',
    gemini: 'Google Gemini 3.6 Flash AI',
  };

  const runTranscription = async (engine = selectedEngine) => {
    if (!videoBlob) {
      setErrorMessage('No video recorded to transcribe.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const result = await TranscriptionService.transcribe(
        engine,
        videoBlob,
        (stage, progress, message) => {
          setProgressState({ stage, percent: progress, message });
        },
        project.apiKey
      );

      const text = result.fullText.trim();
      const check = validateGujaratiTranscript(text);

      if (!check.isValid) {
        // Automatic recognition produced non-Gujarati or hallucinated text
        setTranscriptText('');
        onUpdateTranscript('', []);
        setTranscriptSource('none');
        setManualConfirmed(false);
        setErrorMessage(
          `Automatic Gujarati recognition via ${providerNames[engine]} failed validation: ${check.errorReason || 'Output was not valid Gujarati speech.'}${text ? ` (Raw output: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}")` : ''}`
        );
      } else {
        setTranscriptText(text);
        onUpdateTranscript(text, result.segments);
        setTranscriptSource('auto');
        setManualConfirmed(false);
      }
    } catch (err: any) {
      setErrorMessage(
        `Recognition error via ${providerNames[engine]}: ${err.message || 'Transcription failed.'}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextChange = (newText: string) => {
    setTranscriptText(newText);
    setErrorMessage(null);
    setTranscriptSource('manual');
    setManualConfirmed(false);
    const updatedSegments: TranscriptSegment[] = [
      {
        id: `seg_edit_${Date.now()}`,
        start: 0,
        end: Math.min(30, project.videoDuration || 30),
        text: newText,
      },
    ];
    onUpdateTranscript(newText, updatedSegments);
  };

  const requiresManualConfirmation = transcriptSource !== 'auto';
  const isProceedAllowed =
    validation.isValid &&
    transcriptText.trim().length > 0 &&
    (!requiresManualConfirmation || manualConfirmed);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Video Mini Preview */}
      <div className="glass-card" style={{ padding: '12px' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem' }}>Original Video</h4>
        <VideoPlayer videoBlob={videoBlob} />
      </div>

      {/* Engine Selection & Trigger */}
      {!transcriptText && !isProcessing && (
        <div className="glass-card">
          <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} color="var(--accent-cyan)" />
            Transcribe Gujarati Speech
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
            Select your speech-to-text provider. All outputs are strictly validated for genuine Gujarati script.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {/* Local Whisper */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: selectedEngine === 'whisper' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                border: selectedEngine === 'whisper' ? '1px solid var(--border-glow)' : '1px solid var(--border-glass)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Cpu size={18} color="var(--accent-cyan)" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    Local Neural Whisper (small) <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>[Fully Local]</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Runs in client Web Worker (~244MB model, first use only -- cached in browser after)
                  </div>
                </div>
              </div>
              <input
                type="radio"
                name="engine"
                checked={selectedEngine === 'whisper'}
                onChange={() => setSelectedEngine('whisper')}
              />
            </label>

            {/* Web Speech API */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: selectedEngine === 'webspeech' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                border: selectedEngine === 'webspeech' ? '1px solid var(--border-glow)' : '1px solid var(--border-glass)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Globe size={18} color="var(--accent-emerald)" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    Browser Speech Recognition (gu-IN) <span style={{ fontSize: '0.75rem', color: 'var(--accent-amber)' }}>[Network Dependent on Android]</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Uses device/cloud speech service depending on OS & browser
                  </div>
                </div>
              </div>
              <input
                type="radio"
                name="engine"
                checked={selectedEngine === 'webspeech'}
                onChange={() => setSelectedEngine('webspeech')}
              />
            </label>

            {/* Gemini AI */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: selectedEngine === 'gemini' ? 'rgba(168, 85, 247, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                border: selectedEngine === 'gemini' ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid var(--border-glass)',
                cursor: 'pointer',
                opacity: project.apiKey ? 1 : 0.6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={18} color="var(--accent-purple)" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    Google Gemini 3.6 Flash <span style={{ fontSize: '0.75rem', color: 'var(--accent-purple)' }}>[Network Dependent]</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {project.apiKey ? 'High accuracy cloud transcription' : 'Requires Gemini API Key in Settings'}
                  </div>
                </div>
              </div>
              <input
                type="radio"
                name="engine"
                disabled={!project.apiKey}
                checked={selectedEngine === 'gemini'}
                onChange={() => setSelectedEngine('gemini')}
              />
            </label>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
            onClick={() => runTranscription(selectedEngine)}
          >
            Start Automatic Transcription
          </button>
        </div>
      )}

      {/* Loading & Processing Status */}
      {isProcessing && (
        <LoadingIndicator
          stage={progressState.stage || 'Transcribing Gujarati'}
          message={progressState.message}
          progress={progressState.percent}
        />
      )}

      {/* Failure & Error message */}
      {errorMessage && (
        <div className="glass-card" style={{ borderColor: 'var(--accent-rose)', background: 'rgba(244, 63, 94, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-rose)', marginBottom: '8px' }}>
            <AlertCircle size={20} />
            <h4 style={{ margin: 0 }}>Transcription Notice</h4>
          </div>
          <p style={{ fontSize: '0.85rem', margin: '0 0 14px 0', lineHeight: 1.5 }}>{errorMessage}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              onClick={() => runTranscription(selectedEngine)}
            >
              <RefreshCw size={13} />
              Retry Recognition
            </button>
          </div>
        </div>
      )}

      {/* Editable Gujarati Transcript Area (Always accessible for manual entry/correction) */}
      {!isProcessing && (
        <div className="glass-card animate-slide-up">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Edit3 size={16} color="var(--accent-cyan)" />
              Gujarati Transcript (Editable)
            </label>
            {transcriptText && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                onClick={() => runTranscription(selectedEngine)}
              >
                <RefreshCw size={13} />
                Re-transcribe
              </button>
            )}
          </div>

          <textarea
            className="input-textarea"
            rows={4}
            value={transcriptText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="અહીં ગુજરાતી બોલેલું લખાણ લખો અથવા સુધારો (દા.ત. નમસ્તે, કેમ છો?)..."
          />

          {/* Validation feedback indicator */}
          {transcriptText.trim().length > 0 && (
            <div style={{ marginTop: '8px', fontSize: '0.78rem' }}>
              {validation.isValid ? (
                <div style={{ color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} />
                  <span>Valid Gujarati Script ({validation.gujaratiCharCount} Gujarati characters detected)</span>
                </div>
              ) : (
                <div style={{ color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={14} />
                  <span>{validation.errorReason || 'Please enter text in Gujarati script (ગુજરાતી).'}</span>
                </div>
              )}
            </div>
          )}

          {transcriptText.trim().length > 0 && validation.isValid && requiresManualConfirmation && (
            <div
              className="glass-card"
              style={{
                marginTop: '10px',
                padding: '10px 12px',
                borderColor: 'var(--accent-amber)',
                background: 'rgba(245, 158, 11, 0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '8px' }}>
                <AlertCircle size={14} color="var(--accent-amber)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <p style={{ fontSize: '0.78rem', margin: 0, lineHeight: 1.5 }}>
                  This text was typed or edited by hand, not produced (or last confirmed) by automatic
                  recognition of this video. &quot;Valid Gujarati Script&quot; only means it uses Gujarati
                  characters -- it does not mean it matches what was actually said.
                </p>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={manualConfirmed}
                  onChange={(e) => setManualConfirmed(e.target.checked)}
                />
                <span>I confirm this is a complete, accurate transcript of what is said in the video.</span>
              </label>
            </div>
          )}

          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            A valid Gujarati transcript is required before dubbing into Hindi or English.
          </p>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="bottom-bar">
        <button
          type="button"
          className="btn btn-secondary"
          style={{ flex: 1 }}
          onClick={onBackToRecord}
          disabled={isProcessing}
        >
          <ArrowLeft size={18} />
          Back to Record
        </button>

        <button
          type="button"
          className="btn btn-primary"
          style={{
            flex: 2,
            opacity: isProceedAllowed ? 1 : 0.45,
            cursor: isProceedAllowed ? 'pointer' : 'not-allowed',
          }}
          onClick={onProceedToTranslate}
          disabled={!isProceedAllowed || isProcessing}
        >
          Dub into Hindi / English
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
