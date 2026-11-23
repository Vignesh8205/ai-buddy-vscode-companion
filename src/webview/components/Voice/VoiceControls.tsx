import React, { useState } from 'react';
import { Mic, MicOff, Square, Send } from 'lucide-react';
import { AudioWaveform } from './AudioWaveform';
import { VoiceGender } from '../../../shared/types';

interface VoiceControlsProps {
  isListening: boolean;
  isSpeaking: boolean;
  gender: VoiceGender;
  currentLang: 'ta-IN' | 'en-IN' | 'en-US';
  onSendMessage: (text: string) => void;
  onToggleListen: () => void;
  onStopSpeaking: () => void;
  onLanguageChange: (lang: 'ta-IN' | 'en-IN' | 'en-US') => void;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  isListening,
  isSpeaking,
  gender,
  currentLang,
  onSendMessage,
  onToggleListen,
  onStopSpeaking,
  onLanguageChange,
}) => {
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  const companionName =
    gender === 'small_boy'
      ? 'Chotu'
      : gender === 'vadivelu'
      ? 'Vadivelu'
      : gender === 'santhanam'
      ? 'Santhanam'
      : 'Maya';

  return (
    <div className="voice-controls-panel">
      {/* Primary Chat Input Bar (Text + Voice + Send) */}
      <div className="chat-input-bar">
        <input
          type="text"
          className="chat-text-input"
          placeholder={`Message ${companionName} (Tamil / Tanglish / Eng)...`}
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSend();
          }}
        />

        {inputText.trim().length > 0 ? (
          <button
            className="chat-action-btn btn-send"
            onClick={handleSend}
            title="Send Message"
          >
            <Send size={15} />
          </button>
        ) : (
          <button
            className={`chat-action-btn btn-mic ${isListening ? 'listening' : ''}`}
            onClick={onToggleListen}
            title={isListening ? 'Stop Listening' : 'Speak to AI Buddy'}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            {isListening && <div className="pulse-glow-ring-sm" />}
          </button>
        )}
      </div>

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
            <Square size={14} fill="currentColor" />
            <span style={{ fontSize: '10px', marginLeft: '4px' }}>Stop</span>
          </button>
        )}
      </div>
    </div>
  );
};
