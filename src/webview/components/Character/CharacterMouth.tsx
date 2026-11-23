import React from 'react';
import { CharacterState } from '../../../shared/types';

interface CharacterMouthProps {
  state: CharacterState;
  isMouthOpen: boolean;
}

export const CharacterMouth: React.FC<CharacterMouthProps> = ({ state, isMouthOpen }) => {
  // If actively speaking, oscillate between open and half-open viseme shapes
  if (state === 'speaking') {
    if (isMouthOpen) {
      return (
        <g className="character-mouth speaking-open">
          <path d="M 90 108 Q 100 120 110 108 Q 100 112 90 108" fill="#F43F5E" stroke="#881337" strokeWidth="1.5" />
          {/* cute tooth */}
          <path d="M 97 109 Q 100 112 103 109" fill="#FFFFFF" />
        </g>
      );
    } else {
      return (
        <g className="character-mouth speaking-half">
          <path d="M 92 109 Q 100 115 108 109" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </g>
      );
    }
  }

  switch (state) {
    case 'laughing':
      // Big open laughing mouth with visible tongue
      return (
        <g className="character-mouth laughing">
          <path d="M 88 106 Q 100 124 112 106 Z" fill="#E11D48" stroke="#881337" strokeWidth="1.5" />
          <path d="M 94 115 Q 100 112 106 115 Q 100 123 94 115" fill="#FB7185" />
        </g>
      );

    case 'happy':
      // Wide joyous smile
      return (
        <g className="character-mouth happy">
          <path d="M 88 107 Q 100 119 112 107" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
      );

    case 'confused':
      // Wavy squiggly mouth
      return (
        <g className="character-mouth confused">
          <path d="M 91 109 Q 96 112 100 108 Q 105 105 109 109" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </g>
      );

    case 'surprised':
      // Round 'O' mouth
      return (
        <g className="character-mouth surprised">
          <ellipse cx="100" cy="110" rx="5" ry="7" fill="#E11D48" stroke="#881337" strokeWidth="1.5" />
        </g>
      );

    case 'sad':
      // Downturned pout curve
      return (
        <g className="character-mouth sad">
          <path d="M 91 113 Q 100 106 109 113" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </g>
      );

    case 'thinking':
      // Small pursed mouth to the side
      return (
        <g className="character-mouth thinking">
          <ellipse cx="104" cy="110" rx="3.5" ry="2.5" fill="#F472B6" opacity="0.8" />
          <path d="M 94 109 Q 100 108 106 110" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" fill="none" />
        </g>
      );

    case 'listening':
      // Neutral polite attentive mouth
      return (
        <g className="character-mouth listening">
          <path d="M 94 109 Q 100 111 106 109" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" fill="none" />
        </g>
      );

    case 'idle':
    default:
      // Gentle gentle cute smile
      return (
        <g className="character-mouth idle">
          <path d="M 92 108 Q 100 114 108 108" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </g>
      );
  }
};
