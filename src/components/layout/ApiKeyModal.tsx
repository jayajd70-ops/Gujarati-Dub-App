import React, { useState } from 'react';
import { X, ShieldCheck, ExternalLink, Sparkles } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentApiKey?: string;
  onSaveApiKey: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  currentApiKey = '',
  onSaveApiKey,
}) => {
  const [keyInput, setKeyInput] = useState(currentApiKey);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveApiKey(keyInput.trim());
    onClose();
  };

  const handleRemove = () => {
    setKeyInput('');
    onSaveApiKey('');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '480px',
          margin: 0,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-glow)',
          boxShadow: 'var(--shadow-lg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="var(--accent-cyan)" />
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Gemini AI API Key</h3>
          </div>
          <button type="button" className="btn btn-secondary btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '14px' }}>
          Gujarati Dub Studio works <strong>fully locally and free</strong> by default. You can optionally connect your personal Google Gemini API key for enhanced contextual translation and speech capabilities.
        </p>

        <div
          style={{
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '12px',
            marginBottom: '16px',
            fontSize: '0.8rem',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
          }}
        >
          <ShieldCheck size={18} color="var(--accent-cyan)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Privacy Guarantee:</strong> Your key is stored solely inside your browser's private storage. It is never logged, sent to external servers, or committed.
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
            Enter Gemini API Key (Optional)
          </label>
          <input
            type="password"
            className="input-textarea"
            style={{ minHeight: '44px', height: '44px', padding: '10px 14px' }}
            placeholder="AIzaSy..."
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: '0.8rem',
              color: 'var(--accent-cyan)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Get a free Gemini API key <ExternalLink size={12} />
          </a>

          {currentApiKey && (
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-rose)',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
              onClick={handleRemove}
            >
              Remove key
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>
            Save Key
          </button>
        </div>
      </div>
    </div>
  );
};
