import React, { useEffect, useState } from 'react';
import { CharacterState, VoiceGender } from '../../../shared/types';
import { CharacterEyes } from './CharacterEyes';
import { CharacterMouth } from './CharacterMouth';

interface CharacterCanvasProps {
  state: CharacterState;
  gender: VoiceGender;
  isMouthOpen: boolean;
}

export const CharacterCanvas: React.FC<CharacterCanvasProps> = ({
  state,
  gender,
  isMouthOpen,
}) => {
  const [isBlinking, setIsBlinking] = useState(false);

  // Natural blinking interval
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 160);
    }, 3800);

    return () => clearInterval(blinkInterval);
  }, []);

  const getEmotionBadge = () => {
    switch (state) {
      case 'listening':
        return { text: 'Listening...', emoji: '🎙️', color: '#06B6D4' };
      case 'thinking':
        return { text: 'Thinking...', emoji: '🧠', color: '#A855F7' };
      case 'speaking':
        return { text: 'Speaking', emoji: '💬', color: '#EC4899' };
      case 'laughing':
        return { text: 'Hahaha!', emoji: '😂', color: '#F59E0B' };
      case 'happy':
        return { text: 'Happy!', emoji: '✨', color: '#10B981' };
      case 'confused':
        return { text: 'Confused?', emoji: '🤔', color: '#6366F1' };
      case 'surprised':
        return { text: 'Whoa!', emoji: '😲', color: '#3B82F6' };
      case 'sad':
        return { text: 'Oh no...', emoji: '🥺', color: '#64748B' };
      case 'idle':
      default:
        return { text: 'Ready', emoji: '😊', color: '#8B5CF6' };
    }
  };

  const badge = getEmotionBadge();

  return (
    <div className={`character-container state-${state} gender-${gender}`}>
      {/* Dynamic Emotion Status Pill */}
      <div
        className="character-badge"
        style={{ borderColor: badge.color, boxShadow: `0 0 12px ${badge.color}40` }}
      >
        <span className="badge-emoji">{badge.emoji}</span>
        <span className="badge-text" style={{ color: badge.color }}>
          {badge.text}
        </span>
      </div>

      {/* SVG Animated Chibi Character */}
      <svg
        className={`character-svg ${state === 'speaking' ? 'anim-bounce' : 'anim-float'}`}
        viewBox="0 0 200 200"
        width="100%"
        height="100%"
      >
        <defs>
          {/* Gradients */}
          <radialGradient id="faceGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#1E1B4B" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FED7AA" />
            <stop offset="100%" stopColor="#FDBA74" />
          </linearGradient>
          <linearGradient id="hairGradFemale" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C084FC" />
            <stop offset="100%" stopColor="#7E22CE" />
          </linearGradient>
          <linearGradient id="hairGradMale" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#312E81" />
          </linearGradient>
        </defs>

        {/* Outer Aura Glow */}
        <circle cx="100" cy="100" r="90" fill="url(#faceGlow)" />

        {/* Back Hair for Female */}
        {gender === 'female' && (
          <path
            d="M 52 80 C 40 120 45 150 55 165 C 60 160 62 140 65 110"
            fill="url(#hairGradFemale)"
          />
        )}
        {gender === 'female' && (
          <path
            d="M 148 80 C 160 120 155 150 145 165 C 140 160 138 140 135 110"
            fill="url(#hairGradFemale)"
          />
        )}

        {/* Body / Hoodie */}
        <path
          d="M 68 152 Q 100 145 132 152 L 148 190 Q 100 195 52 190 Z"
          fill="url(#bodyGrad)"
          stroke="#4338CA"
          strokeWidth="1.5"
        />
        {/* Collar Accent */}
        <path
          d="M 85 151 Q 100 162 115 151"
          stroke="#818CF8"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* Head Base / Face */}
        <ellipse cx="100" cy="95" rx="46" ry="48" fill="url(#skinGrad)" />

        {/* Blushing Cheeks (cute pink glow) */}
        {(state === 'happy' || state === 'laughing' || state === 'speaking' || state === 'idle') && (
          <g className="cheeks">
            <ellipse cx="68" cy="98" rx="8" ry="4" fill="#F472B6" opacity={state === 'happy' || state === 'laughing' ? 0.75 : 0.4} />
            <ellipse cx="132" cy="98" rx="8" ry="4" fill="#F472B6" opacity={state === 'happy' || state === 'laughing' ? 0.75 : 0.4} />
          </g>
        )}

        {/* Confusion Sweatdrop */}
        {state === 'confused' && (
          <path
            d="M 142 66 C 142 63 147 57 147 57 C 147 57 152 63 152 66 C 152 69 150 71 147 71 C 144 71 142 69 142 66 Z"
            fill="#38BDF8"
          />
        )}

        {/* Eyes Component */}
        <CharacterEyes state={state} isBlinking={isBlinking} />

        {/* Cute Small Nose */}
        <circle cx="100" cy="99" r="1.5" fill="#FB923C" opacity="0.6" />

        {/* Mouth Component */}
        <CharacterMouth state={state} isMouthOpen={isMouthOpen} />

        {/* Hair Bangs & Style */}
        {gender === 'female' ? (
          <g className="hair-female">
            <path
              d="M 54 82 C 54 50 80 42 100 42 C 120 42 146 50 146 82 C 138 72 128 70 120 74 C 110 68 95 68 85 74 C 75 70 65 72 54 82 Z"
              fill="url(#hairGradFemale)"
            />
            {/* Cute Hair Ribbon / Clip */}
            <circle cx="64" cy="58" r="6" fill="#F43F5E" />
            <circle cx="64" cy="58" r="2.5" fill="#FFFFFF" />
          </g>
        ) : (
          <g className="hair-male">
            <path
              d="M 52 82 C 52 48 78 40 100 40 C 122 40 148 48 148 82 C 142 70 134 68 124 73 C 115 64 98 64 90 73 C 80 67 66 70 52 82 Z"
              fill="url(#hairGradMale)"
            />
            {/* Cool spiked tufts */}
            <path d="M 85 41 L 95 32 L 98 42 Z" fill="url(#hairGradMale)" />
            <path d="M 102 41 L 112 30 L 116 42 Z" fill="url(#hairGradMale)" />
          </g>
        )}

        {/* Developer Cyber Headset / Headphones */}
        <g className="headset">
          {/* Headband arch */}
          <path
            d="M 52 90 A 50 50 0 0 1 148 90"
            stroke="#1E293B"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 56 86 A 46 46 0 0 1 144 86"
            stroke="#8B5CF6"
            strokeWidth="1.5"
            fill="none"
            strokeOpacity="0.8"
          />
          {/* Left Earpad */}
          <rect x="44" y="80" width="12" height="24" rx="6" fill="#0F172A" stroke="#8B5CF6" strokeWidth="2" />
          <circle cx="50" cy="92" r="3" fill="#06B6D4" />
          {/* Right Earpad */}
          <rect x="144" y="80" width="12" height="24" rx="6" fill="#0F172A" stroke="#8B5CF6" strokeWidth="2" />
          <circle cx="150" cy="92" r="3" fill="#06B6D4" />
          {/* Microphone boom */}
          <path
            d="M 50 96 Q 50 120 78 120"
            stroke="#334155"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="79" cy="120" r="3.5" fill={state === 'listening' ? '#22C55E' : '#64748B'} />
        </g>
      </svg>
    </div>
  );
};
