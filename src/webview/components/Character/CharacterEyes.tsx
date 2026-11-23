import React from 'react';
import { CharacterState } from '../../../shared/types';

interface CharacterEyesProps {
  state: CharacterState;
  isBlinking: boolean;
}

export const CharacterEyes: React.FC<CharacterEyesProps> = ({ state, isBlinking }) => {
  if (isBlinking && state !== 'laughing' && state !== 'happy') {
    // Closed blinking slit
    return (
      <g className="character-eyes blinking">
        <path d="M 68 85 Q 80 88 92 85" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M 108 85 Q 120 88 132 85" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" />
      </g>
    );
  }

  switch (state) {
    case 'laughing':
    case 'happy':
      // Joyful squinting crescent arcs (^ ^)
      return (
        <g className="character-eyes happy-eyes">
          <path d="M 66 87 Q 80 72 94 87" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d="M 106 87 Q 120 72 134 87" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        </g>
      );

    case 'confused':
      // One eye wide, one smaller with question look
      return (
        <g className="character-eyes confused-eyes">
          {/* Left eyebrow raised */}
          <path d="M 66 70 Q 80 63 94 72" stroke="#A78BFA" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* Right eyebrow lowered */}
          <path d="M 106 74 Q 120 78 134 73" stroke="#A78BFA" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* Left eye normal */}
          <ellipse cx="80" cy="85" rx="10" ry="12" fill="#FFFFFF" />
          <circle cx="81" cy="85" r="6" fill="#8B5CF6" />
          <circle cx="78" cy="82" r="2.5" fill="#FFFFFF" />
          {/* Right eye squinted */}
          <ellipse cx="120" cy="86" rx="8" ry="7" fill="#FFFFFF" />
          <circle cx="120" cy="86" r="4.5" fill="#8B5CF6" />
        </g>
      );

    case 'surprised':
      // Big wide astonished eyes with white shines
      return (
        <g className="character-eyes surprised-eyes">
          <path d="M 65 67 Q 80 60 95 67" stroke="#A78BFA" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M 105 67 Q 120 60 135 67" stroke="#A78BFA" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <ellipse cx="80" cy="84" rx="13" ry="14" fill="#FFFFFF" />
          <circle cx="80" cy="84" r="8" fill="#3B82F6" />
          <circle cx="77" cy="80" r="3.5" fill="#FFFFFF" />
          <circle cx="83" cy="87" r="1.5" fill="#FFFFFF" />
          <ellipse cx="120" cy="84" rx="13" ry="14" fill="#FFFFFF" />
          <circle cx="120" cy="84" r="8" fill="#3B82F6" />
          <circle cx="117" cy="80" r="3.5" fill="#FFFFFF" />
          <circle cx="123" cy="87" r="1.5" fill="#FFFFFF" />
        </g>
      );

    case 'sad':
      // Droopy eyes with worried eyebrows
      return (
        <g className="character-eyes sad-eyes">
          <path d="M 68 70 Q 80 77 92 73" stroke="#A78BFA" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M 108 73 Q 120 77 132 70" stroke="#A78BFA" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <ellipse cx="80" cy="87" rx="9" ry="10" fill="#FFFFFF" />
          <circle cx="80" cy="88" r="5.5" fill="#6B7280" />
          <ellipse cx="120" cy="87" rx="9" ry="10" fill="#FFFFFF" />
          <circle cx="120" cy="88" r="5.5" fill="#6B7280" />
        </g>
      );

    case 'thinking':
      // Eyes looking up and to the right
      return (
        <g className="character-eyes thinking-eyes">
          <path d="M 66 70 Q 80 67 94 70" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M 106 67 Q 120 64 134 68" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" fill="none" />
          <ellipse cx="80" cy="84" rx="10" ry="11" fill="#FFFFFF" />
          <circle cx="83" cy="80" r="6" fill="#8B5CF6" />
          <circle cx="85" cy="78" r="2" fill="#FFFFFF" />
          <ellipse cx="120" cy="84" rx="10" ry="11" fill="#FFFFFF" />
          <circle cx="123" cy="80" r="6" fill="#8B5CF6" />
          <circle cx="125" cy="78" r="2" fill="#FFFFFF" />
        </g>
      );

    case 'listening':
      // Attentive wide eyes, bright sparkles
      return (
        <g className="character-eyes listening-eyes">
          <ellipse cx="80" cy="84" rx="11" ry="12" fill="#FFFFFF" />
          <circle cx="80" cy="84" r="6.5" fill="#06B6D4" />
          <circle cx="77" cy="80" r="2.5" fill="#FFFFFF" />
          <ellipse cx="120" cy="84" rx="11" ry="12" fill="#FFFFFF" />
          <circle cx="120" cy="84" r="6.5" fill="#06B6D4" />
          <circle cx="117" cy="80" r="2.5" fill="#FFFFFF" />
        </g>
      );

    case 'idle':
    case 'speaking':
    default:
      // Vibrant, friendly anime eyes with pupil highlights
      return (
        <g className="character-eyes default-eyes">
          {/* Eyebrows */}
          <path d="M 68 70 Q 80 66 92 70" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M 108 70 Q 120 66 132 70" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" fill="none" />
          {/* Left Eye */}
          <ellipse cx="80" cy="84" rx="10" ry="12" fill="#FFFFFF" />
          <ellipse cx="80" cy="85" rx="6.5" ry="8" fill="#8B5CF6" />
          <circle cx="78" cy="81" r="2.5" fill="#FFFFFF" />
          <circle cx="82" cy="87" r="1.2" fill="#FFFFFF" />
          {/* Right Eye */}
          <ellipse cx="120" cy="84" rx="10" ry="12" fill="#FFFFFF" />
          <ellipse cx="120" cy="85" rx="6.5" ry="8" fill="#8B5CF6" />
          <circle cx="118" cy="81" r="2.5" fill="#FFFFFF" />
          <circle cx="122" cy="87" r="1.2" fill="#FFFFFF" />
        </g>
      );
  }
};
