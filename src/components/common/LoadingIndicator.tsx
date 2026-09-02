import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingIndicatorProps {
  stage: string;
  message?: string;
  progress?: number;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  stage,
  message,
  progress,
}) => {
  return (
    <div
      className="glass-card animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        textAlign: 'center',
        gap: '16px',
        border: '1px solid var(--border-glow)',
      }}
    >
      <Loader2 size={38} color="var(--accent-cyan)" className="animate-spin" />
      <div>
        <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
          {stage}
        </h4>
        {message && (
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {message}
          </p>
        )}
      </div>

      {typeof progress === 'number' && progress >= 0 && (
        <div style={{ width: '100%', maxWidth: '280px' }}>
          <div className="audio-meter-bar" style={{ height: '8px' }}>
            <div
              className="audio-meter-fill"
              style={{
                width: `${Math.min(100, Math.max(0, progress))}%`,
                background: 'var(--grad-primary)',
              }}
            />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {Math.round(progress)}%
          </div>
        </div>
      )}
    </div>
  );
};
