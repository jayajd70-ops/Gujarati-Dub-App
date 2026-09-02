import React from 'react';
import { SubtitleSettings, SubtitleFontSize } from '../../types/project';
import { Type, Check } from 'lucide-react';

interface SubtitleControlProps {
  settings: SubtitleSettings;
  onChange: (settings: Partial<SubtitleSettings>) => void;
}

export const SubtitleControl: React.FC<SubtitleControlProps> = ({
  settings,
  onChange,
}) => {
  const fontSizes: { key: SubtitleFontSize; label: string }[] = [
    { key: 'sm', label: 'Small' },
    { key: 'md', label: 'Medium' },
    { key: 'lg', label: 'Large' },
  ];

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Type size={18} color="var(--accent-purple)" />
          <h4 style={{ margin: 0, fontSize: '1rem' }}>Subtitles</h4>
        </div>

        <button
          type="button"
          className={`btn ${settings.enabled ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '6px 14px', fontSize: '0.8rem', height: '32px' }}
          onClick={() => onChange({ enabled: !settings.enabled })}
        >
          {settings.enabled ? 'Subtitles ON' : 'Subtitles OFF'}
        </button>
      </div>

      {settings.enabled && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Font Size:</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {fontSizes.map((s) => {
              const isSelected = settings.fontSize === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 12px', fontSize: '0.75rem', height: '28px' }}
                  onClick={() => onChange({ fontSize: s.key })}
                >
                  {isSelected && <Check size={12} />}
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
