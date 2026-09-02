import React from 'react';
import { AppStage } from '../../types/project';
import { Camera, FileText, Languages, Volume2, Download, CheckCircle2 } from 'lucide-react';

interface StepNavigationProps {
  currentStage: AppStage;
  onSelectStage: (stage: AppStage) => void;
  canNavigateTo: (stage: AppStage) => boolean;
}

const STEPS: { stage: AppStage; label: string; icon: React.ReactNode }[] = [
  { stage: 'record', label: '1. Record', icon: <Camera size={14} /> },
  { stage: 'transcript', label: '2. Transcript', icon: <FileText size={14} /> },
  { stage: 'translate', label: '3. Translate', icon: <Languages size={14} /> },
  { stage: 'dub', label: '4. Voice Dub', icon: <Volume2 size={14} /> },
  { stage: 'export', label: '5. Export', icon: <Download size={14} /> },
];

export const StepNavigation: React.FC<StepNavigationProps> = ({
  currentStage,
  onSelectStage,
  canNavigateTo,
}) => {
  const currentIdx = STEPS.findIndex((s) => s.stage === currentStage);

  return (
    <nav className="step-navigation" aria-label="Workflow Steps">
      {STEPS.map((step, idx) => {
        const isActive = step.stage === currentStage;
        const isCompleted = idx < currentIdx;
        const isAllowed = canNavigateTo(step.stage);

        return (
          <button
            key={step.stage}
            type="button"
            className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
            disabled={!isAllowed}
            onClick={() => onSelectStage(step.stage)}
            style={{
              opacity: isAllowed ? 1 : 0.4,
              cursor: isAllowed ? 'pointer' : 'not-allowed',
            }}
          >
            {isCompleted ? <CheckCircle2 size={14} /> : step.icon}
            <span>{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
