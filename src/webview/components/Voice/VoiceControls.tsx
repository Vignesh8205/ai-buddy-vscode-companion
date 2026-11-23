import React from 'react';
import { Mic, MicOff, Square, Volume2 } from 'lucide-react';
import { AudioWaveform } from './AudioWaveform';

interface VoiceControlsProps {
  isListening: boolean;
  isSpeaking: boolean;
  currentLang: 'ta-IN' | 'en-IN' | 'en-US';
  onToggleListen: () => void;
  onStopSpeaking: () => void;
  onLanguageChange: (lang: 'ta-IN' | 'en-IN' | 'en-US') => void;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  isListening,
  isSpeaking,
  currentLang,
  onToggleListen,
  onStopSpeaking,
  onLanguageChange,
}) => {
  return (
    <div className="voice-controls-panel">
      {/* Visual Audio Waveform */}
      <AudioWaveform
        isActive={isListening || isSpeaking}
        color={isListening ? '#06B6D4' : isSpeaking ? '#EC4899' : '#8B5CF6'}
      />

      <div className="voice-action-row">
        {/* Language selector toggle */}
        <div className="lang-pill-selector">
          <button
            className={`lang-btn ${currentLang === 'en-IN' ? 'active' : ''}`}
            onClick={() => onLanguageChange('en-IN')}
            title="Tanglish / Indian English"
          >
            Tanglish
          </button>
          <button
            className={`lang-btn ${currentLang === 'ta-IN' ? 'active' : ''}`}
            onClick={() => onLanguageChange('ta-IN')}
            title="Tamil Recognition"
          >
            தமிழ்
          </button>
          <button
            className={`lang-btn ${currentLang === 'en-US' ? 'active' : ''}`}
            onClick={() => onLanguageChange('en-US')}
            title="English Recognition"
          >
            English
          </button>
        </div>

        {/* Interrupt / Stop Button if Character is speaking */}
        {isSpeaking && (
          <button
            className="control-circle-btn btn-stop"
            onClick={onStopSpeaking}
            title="Interrupt speech"
          >
            <Square size={16} fill="currentColor" />
          </button>
        )}

        {/* Primary Glowing Mic Button */}
        <button
          className={`mic-primary-btn ${isListening ? 'listening' : ''}`}
          onClick={onToggleListen}
          title={isListening ? 'Stop Listening' : 'Speak to AI Buddy'}
        >
          {isListening ? (
            <div className="mic-listening-content">
              <MicOff size={22} />
              <div className="pulse-glow-ring" />
            </div>
          ) : (
            <Mic size={22} />
          )}
        </button>
      </div>
    </div>
  );
};
