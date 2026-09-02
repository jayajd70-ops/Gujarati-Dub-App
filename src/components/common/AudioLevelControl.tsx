import React from 'react';
import { Volume2, VolumeX, Mic, Music } from 'lucide-react';
import { AudioSettings } from '../../types/project';

interface AudioLevelControlProps {
  settings: AudioSettings;
  onChange: (settings: Partial<AudioSettings>) => void;
}

export const AudioLevelControl: React.FC<AudioLevelControlProps> = ({
  settings,
  onChange,
}) => {
  return (
    <div className="glass-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Music size={18} color="var(--accent-cyan)" />
          <h4 style={{ margin: 0, fontSize: '1rem' }}>Audio Mix Controls</h4>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Truthful Level Mixing</span>
      </div>

      {/* Original Audio Level */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Mic size={15} color="var(--text-secondary)" />
            Original Audio Track
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: settings.isOriginalMuted ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
              {settings.isOriginalMuted ? 'Muted' : `${Math.round(settings.originalAudioVolume * 100)}%`}
            </span>
            <button
              type="button"
              className={`btn btn-secondary ${settings.isOriginalMuted ? 'btn-danger' : ''}`}
              style={{ padding: '4px 10px', fontSize: '0.75rem', height: '28px' }}
              onClick={() => onChange({ isOriginalMuted: !settings.isOriginalMuted })}
            >
              {settings.isOriginalMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              {settings.isOriginalMuted ? 'Unmute' : 'Mute Original'}
            </button>
          </div>
        </div>

        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          disabled={settings.isOriginalMuted}
          value={settings.isOriginalMuted ? 0 : settings.originalAudioVolume}
          onChange={(e) => onChange({ originalAudioVolume: parseFloat(e.target.value) })}
          className="slider-input"
          style={{ opacity: settings.isOriginalMuted ? 0.3 : 1 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          <span>Silent (0%)</span>
          <span>Ambient (15% Default)</span>
          <span>Full (100%)</span>
        </div>
      </div>

      {/* Dubbed Voice Level */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Volume2 size={15} color="var(--accent-cyan)" />
            Dubbed Voice Level
          </label>
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
            {Math.round(settings.dubbedAudioVolume * 100)}%
          </span>
        </div>

        <input
          type="range"
          min="0"
          max="1.5"
          step="0.05"
          value={settings.dubbedAudioVolume}
          onChange={(e) => onChange({ dubbedAudioVolume: parseFloat(e.target.value) })}
          className="slider-input"
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          <span>0%</span>
          <span>100% (Standard)</span>
          <span>150% (Boosted)</span>
        </div>
      </div>
    </div>
  );
};
