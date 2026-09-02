import React, { useState, useEffect } from 'react';
import { Languages, ArrowRight, ArrowLeft, RefreshCw, Sparkles, Globe, AlertCircle, CheckCircle2, Edit3 } from 'lucide-react';
import { ProjectData, TargetLanguage, TranslatedSegment } from '../../types/project';
import { TranslationService } from '../../services/translation/translationEngine';
import { validateTranslation, ValidationResult } from '../../utils/textValidation';
import { LoadingIndicator } from '../common/LoadingIndicator';

interface TranslateStepProps {
  project: ProjectData;
  onUpdateTargetLanguage: (lang: TargetLanguage) => void;
  onUpdateTranslation: (text: string, segments: TranslatedSegment[]) => void;
  onProceedToDubVoice: () => void;
  onBackToTranscript: () => void;
}

export const TranslateStep: React.FC<TranslateStepProps> = ({
  project,
  onUpdateTargetLanguage,
  onUpdateTranslation,
  onProceedToDubVoice,
  onBackToTranscript,
}) => {
  const [targetLang, setTargetLang] = useState<TargetLanguage>(project.targetLanguage || 'hi');
  const [translatedText, setTranslatedText] = useState<string>(project.translatedText || '');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult>(() =>
    validateTranslation(project.gujaratiTranscript, project.translatedText, project.targetLanguage || 'hi')
  );

  // Sync with project state if updated/cleared from upstream
  useEffect(() => {
    setTranslatedText(project.translatedText || '');
  }, [project.translatedText]);

  useEffect(() => {
    setTargetLang(project.targetLanguage || 'hi');
  }, [project.targetLanguage]);

  useEffect(() => {
    setValidation(validateTranslation(project.gujaratiTranscript, translatedText, targetLang));
  }, [translatedText, targetLang, project.gujaratiTranscript]);

  const providerName = project.apiKey
    ? 'Google Gemini 3.6 Flash Dubbing Translation'
    : 'Free Web Translation API';

  const runTranslation = async (lang: TargetLanguage) => {
    if (!project.gujaratiTranscript) {
      setErrorMessage('No Gujarati transcript available.');
      return;
    }

    setIsTranslating(true);
    setErrorMessage(null);

    try {
      const res = await TranslationService.translate(
        project.gujaratiTranscript,
        lang,
        project.transcriptSegments,
        !!project.apiKey,
        project.apiKey
      );

      const check = validateTranslation(project.gujaratiTranscript, res.translatedText, lang);
      if (!check.isValid) {
        setTranslatedText('');
        onUpdateTranslation('', []);
        setErrorMessage(`Translation via ${providerName} failed validation: ${check.errorReason}`);
      } else {
        setTranslatedText(res.translatedText);
        onUpdateTranslation(res.translatedText, res.translatedSegments);
      }
    } catch (err: any) {
      setTranslatedText('');
      onUpdateTranslation('', []);
      setErrorMessage(`Translation error via ${providerName}: ${err.message || 'Translation failed.'}`);
    } finally {
      setIsTranslating(false);
    }
  };

  // Auto-translate on mount or when language changes if translatedText is empty
  useEffect(() => {
    if (!translatedText && project.gujaratiTranscript) {
      runTranslation(targetLang);
    }
  }, [targetLang, project.gujaratiTranscript]);

  const handleLanguageChange = (lang: TargetLanguage) => {
    setTargetLang(lang);
    onUpdateTargetLanguage(lang);
    setTranslatedText('');
    setErrorMessage(null);
    runTranslation(lang);
  };

  const handleTextChange = (text: string) => {
    setTranslatedText(text);
    setErrorMessage(null);
    const updatedSegments: TranslatedSegment[] = [
      {
        id: `trans_custom_${Date.now()}`,
        start: 0,
        end: Math.min(30, project.videoDuration || 30),
        originalText: project.gujaratiTranscript,
        translatedText: text,
      },
    ];
    onUpdateTranslation(text, updatedSegments);
  };

  const isProceedAllowed = validation.isValid && translatedText.trim().length > 0;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Gujarati Reference Card */}
      <div className="glass-card" style={{ padding: '14px', background: 'rgba(15, 23, 42, 0.4)' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
          Original Gujarati Transcript
        </span>
        <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          "{project.gujaratiTranscript}"
        </p>
      </div>

      {/* Target Language Switcher */}
      <div className="glass-card">
        <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Languages size={18} color="var(--accent-cyan)" />
          Dub Target Language
        </h3>

        <div className="lang-selector" style={{ marginBottom: '14px' }}>
          <button
            type="button"
            className={`lang-btn ${targetLang === 'hi' ? 'active' : ''}`}
            onClick={() => handleLanguageChange('hi')}
          >
            🇮🇳 Hindi (हिन्दी)
          </button>
          <button
            type="button"
            className={`lang-btn ${targetLang === 'en' ? 'active' : ''}`}
            onClick={() => handleLanguageChange('en')}
          >
            🇬🇧 English
          </button>
        </div>

        {/* Translation provider indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-glass)',
          }}
        >
          {project.apiKey ? (
            <>
              <Sparkles size={14} color="var(--accent-purple)" />
              <span>Active Provider: <strong>Google Gemini 3.6 Flash</strong> (Network-dependent)</span>
            </>
          ) : (
            <>
              <Globe size={14} color="var(--accent-cyan)" />
              <span>Active Provider: <strong>Free Web Translation API</strong> (Network-dependent)</span>
            </>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isTranslating && (
        <LoadingIndicator
          stage={`Translating into ${targetLang === 'hi' ? 'Hindi' : 'English'}`}
          message="Validating translation output..."
        />
      )}

      {/* Error state */}
      {errorMessage && (
        <div className="glass-card" style={{ borderColor: 'var(--accent-rose)', background: 'rgba(244, 63, 94, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-rose)', marginBottom: '8px' }}>
            <AlertCircle size={20} />
            <h4 style={{ margin: 0 }}>Translation Notice</h4>
          </div>
          <p style={{ fontSize: '0.85rem', margin: '0 0 10px 0', lineHeight: 1.5 }}>{errorMessage}</p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
            Please verify your network connection, retry translation, or enter the translation manually below.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            onClick={() => runTranslation(targetLang)}
          >
            <RefreshCw size={13} />
            Retry Translation
          </button>
        </div>
      )}

      {/* Editable Translated Text */}
      {!isTranslating && (
        <div className="glass-card animate-slide-up">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Edit3 size={16} color="var(--accent-cyan)" />
              {targetLang === 'hi' ? 'Hindi Translation (हिन्दी)' : 'English Translation'} (Editable)
            </label>
            {translatedText && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                onClick={() => runTranslation(targetLang)}
              >
                <RefreshCw size={13} />
                Re-translate
              </button>
            )}
          </div>

          <textarea
            className="input-textarea"
            rows={4}
            value={translatedText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={
              targetLang === 'hi'
                ? 'हिन्दी अनुवाद यहाँ लिखें અથવા સુધારો (उदा. नमस्ते, आप कैसे हैं?)...'
                : 'Enter or edit English translation here (e.g. Hello, how are you?)...'
            }
          />

          {/* Validation feedback indicator */}
          {translatedText.trim().length > 0 && (
            <div style={{ marginTop: '8px', fontSize: '0.78rem' }}>
              {validation.isValid ? (
                <div style={{ color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} />
                  <span>Valid {targetLang === 'hi' ? 'Hindi (Devanagari)' : 'English'} Translation</span>
                </div>
              ) : (
                <div style={{ color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={14} />
                  <span>{validation.errorReason}</span>
                </div>
              )}
            </div>
          )}

          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            A validated {targetLang === 'hi' ? 'Hindi (Devanagari)' : 'English'} translation is required to generate speech.
          </p>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="bottom-bar">
        <button
          type="button"
          className="btn btn-secondary"
          style={{ flex: 1 }}
          onClick={onBackToTranscript}
          disabled={isTranslating}
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <button
          type="button"
          className="btn btn-primary"
          style={{
            flex: 2,
            opacity: isProceedAllowed ? 1 : 0.45,
            cursor: isProceedAllowed ? 'pointer' : 'not-allowed',
          }}
          onClick={onProceedToDubVoice}
          disabled={!isProceedAllowed || isTranslating}
        >
          Generate Voice & Preview
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
