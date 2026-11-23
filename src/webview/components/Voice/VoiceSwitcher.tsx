import React from 'react';
import { VoiceGender } from '../../../shared/types';
import { Sparkles, User } from 'lucide-react';

interface VoiceSwitcherProps {
  gender: VoiceGender;
  onSelect: (gender: VoiceGender) => void;
}

export const VoiceSwitcher: React.FC<VoiceSwitcherProps> = ({ gender, onSelect }) => {
  return (
    <div className="voice-switcher-container">
      <div className="voice-switcher-pill">
        <button
          className={`voice-choice-btn ${gender === 'female' ? 'active female' : ''}`}
          onClick={() => onSelect('female')}
          title="Maya: Cute, energetic & funny female companion"
        >
          <span className="voice-avatar">👩</span>
          <span className="voice-label">Maya</span>
          {gender === 'female' && <Sparkles size={12} className="active-sparkle" />}
        </button>

        <button
          className={`voice-choice-btn ${gender === 'male' ? 'active male' : ''}`}
          onClick={() => onSelect('male')}
          title="Vikram: Friendly, witty & energetic male companion"
        >
          <span className="voice-avatar">👨</span>
          <span className="voice-label">Vikram</span>
          {gender === 'male' && <Sparkles size={12} className="active-sparkle" />}
        </button>
      </div>
    </div>
  );
};
