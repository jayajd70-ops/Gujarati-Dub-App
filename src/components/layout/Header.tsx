import React, { useState, useEffect } from 'react';
import { Key, Moon, Sun, Trash2 } from 'lucide-react';

interface HeaderProps {
  onOpenApiKeyModal: () => void;
  onClearProject: () => void;
  hasApiKey: boolean;
  hasProjectData: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenApiKeyModal,
  onClearProject,
  hasApiKey,
  hasProjectData,
}) => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedTheme = (localStorage.getItem('gds_theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('gds_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  return (
    <header className="app-header">
      <div className="brand-badge">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="Logo" className="brand-logo" />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="brand-title">Gujarati Dub Studio</span>
            <span className="trial-badge">30s Trial</span>
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
            Camera → Gujarati → Dubbed MP4
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {hasProjectData && (
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={onClearProject}
            title="Delete Recording / Clear Project"
            aria-label="Clear Project"
          >
            <Trash2 size={18} color="var(--accent-rose)" />
          </button>
        )}

        <button
          type="button"
          className="btn btn-secondary btn-icon"
          onClick={onOpenApiKeyModal}
          title={hasApiKey ? 'Gemini API Key (Configured)' : 'Configure Gemini API Key (Optional)'}
          aria-label="Gemini API Key"
          style={{ position: 'relative' }}
        >
          <Key size={18} color={hasApiKey ? 'var(--accent-emerald)' : 'var(--text-secondary)'} />
          {hasApiKey && (
            <span
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: 'var(--accent-emerald)',
              }}
            />
          )}
        </button>

        <button
          type="button"
          className="btn btn-secondary btn-icon"
          onClick={toggleTheme}
          title="Toggle Theme"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
};
