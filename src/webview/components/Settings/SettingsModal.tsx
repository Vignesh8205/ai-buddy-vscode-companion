import React, { useState } from 'react';
import {
  Key,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Save,
  Lock,
  EyeOff,
  BellRing,
} from 'lucide-react';
import { ProactiveFrequency, ProjectSummary } from '../../../shared/types';

interface SettingsModalProps {
  isOpen: boolean;
  hasApiKey: boolean;
  proactiveFrequency: ProactiveFrequency;
  contextSummary?: ProjectSummary | null;
  onClose: () => void;
  onSaveKey: (key: string) => void;
  onSetFrequency: (freq: ProactiveFrequency) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  hasApiKey,
  proactiveFrequency,
  contextSummary,
  onClose,
  onSaveKey,
  onSetFrequency,
}) => {
  const [inputKey, setInputKey] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveKey(inputKey);
    setInputKey('');
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Key size={18} className="title-icon" />
            <span>AI Buddy Settings & Personality</span>
          </div>
          <button className="icon-btn-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* API Key Status */}
          <div className="api-status-banner">
            {hasApiKey ? (
              <div className="status-badge configured">
                <ShieldCheck size={16} />
                <span>Gemini API Key configured in OS SecretStorage</span>
              </div>
            ) : (
              <div className="status-badge missing">
                <ShieldAlert size={16} />
                <span>API Key missing – AI Buddy requires Gemini API</span>
              </div>
            )}
          </div>

          <label className="input-label">
            <span>Google Gemini API Key:</span>
            <input
              type="password"
              className="key-input"
              placeholder="Paste your AI Studio API key (AIzaSy...)"
              value={inputKey}
              onChange={e => setInputKey(e.target.value)}
            />
          </label>

          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="get-key-link"
          >
            <span>Get a free Gemini API Key from Google AI Studio</span>
            <ExternalLink size={13} />
          </a>

          {/* Proactive Conversation Frequency */}
          <div className="frequency-selector-box">
            <div className="freq-header">
              <BellRing size={14} className="freq-icon" />
              <span>Proactive Companion Chatter:</span>
            </div>
            <div className="freq-pill-group">
              {(['high', 'medium', 'low', 'off'] as ProactiveFrequency[]).map(freq => (
                <button
                  key={freq}
                  className={`freq-btn ${proactiveFrequency === freq ? 'active' : ''}`}
                  onClick={() => onSetFrequency(freq)}
                >
                  {freq === 'high'
                    ? 'Frequent (2m)'
                    : freq === 'medium'
                    ? 'Normal (4m)'
                    : freq === 'low'
                    ? 'Quiet (8m)'
                    : 'Mute'}
                </button>
              ))}
            </div>
            <span className="freq-help-text">
              Controls when AI Buddy initiates jokes, coding break checks, and celebrations.
            </span>
          </div>

          {/* Privacy & Workspace Monitoring Panel */}
          <div className="privacy-info-box">
            <div className="privacy-header">
              <Lock size={14} className="privacy-icon" />
              <span>Workspace Privacy & Transparency</span>
            </div>
            <div className="privacy-item">
              <EyeOff size={13} className="bullet-icon" />
              <span>Secrets (.env, id_rsa, keys) strictly excluded.</span>
            </div>
            {contextSummary && (
              <div className="active-context-badge">
                <span>Active Project: <strong>{contextSummary.projectName}</strong> ({contextSummary.primaryLanguage})</span>
                {contextSummary.activeFile && (
                  <span>Active File: {contextSummary.activeFile.name} (Line {contextSummary.activeFile.cursorLine})</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={!inputKey.trim()}
          >
            <Save size={14} />
            <span>Save Key</span>
          </button>
        </div>
      </div>
    </div>
  );
};
