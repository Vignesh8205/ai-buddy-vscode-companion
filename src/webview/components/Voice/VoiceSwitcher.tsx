import React from 'react';
import { VoiceGender } from '../../../shared/types';
import { Sparkles, User } from 'lucide-react';

interface VoiceSwitcherProps {
  gender: VoiceGender;
  onSelect: (gender: VoiceGender) => void;
}

import React from 'react';
import { VoiceGender } from '../../../shared/types';
import { Sparkles } from 'lucide-react';

interface VoiceSwitcherProps {
  gender: VoiceGender;
  onSelect: (gender: VoiceGender) => void;
}

export const VoiceSwitcher: React.FC<VoiceSwitcherProps> = ({ gender, onSelect }) => {
  return (
    <div className="voice-switcher-container">
      <div className="voice-switcher-pill">
        <button
          className={`voice-choice-btn ${gender === 'small_boy' ? 'active small_boy' : ''}`}
          onClick={() => onSelect('small_boy')}
          title="Small Boy (Chotu): Cute, energetic, playful kid voice!"
        >
          <span className="voice-avatar">👦</span>
          <span className="voice-label">Small Boy</span>
          {gender === 'small_boy' && <Sparkles size={11} className="active-sparkle" />}
        </button>

        <button
          className={`voice-choice-btn ${gender === 'vadivelu' || gender === 'male' ? 'active vadivelu' : ''}`}
          onClick={() => onSelect('vadivelu')}
          title="Vadivelu: Vaigai Puyal comedy king & iconic punchlines!"
        >
          <span className="voice-avatar">🎭</span>
          <span className="voice-label">Vadivelu</span>
          {(gender === 'vadivelu' || gender === 'male') && <Sparkles size={11} className="active-sparkle" />}
        </button>

        <button
          className={`voice-choice-btn ${gender === 'santhanam' ? 'active santhanam' : ''}`}
          onClick={() => onSelect('santhanam')}
          title="Santhanam: Fast counters & sarcastic comedy pair programmer!"
        >
          <span className="voice-avatar">😎</span>
          <span className="voice-label">Santhanam</span>
          {gender === 'santhanam' && <Sparkles size={11} className="active-sparkle" />}
        </button>

        <button
          className={`voice-choice-btn ${gender === 'maya' || gender === 'female' ? 'active maya' : ''}`}
          onClick={() => onSelect('maya')}
          title="Maya: Sweet, warm & friendly companion voice"
        >
          <span className="voice-avatar">🌸</span>
          <span className="voice-label">Maya</span>
          {(gender === 'maya' || gender === 'female') && <Sparkles size={11} className="active-sparkle" />}
        </button>
      </div>
    </div>
  );
};
