import React, { useEffect, useRef, useState } from 'react';
import {
  CharacterState,
  ChatMessage,
  HostToWebviewMessage,
  ProactiveFrequency,
  ProjectSummary,
  VoiceGender,
} from '../shared/types';
import { getVsCodeApi, subscribeToHostMessages } from './services/vscodeBridge';
import { SpeechService } from './services/speechService';
import { CharacterCanvas } from './components/Character/CharacterCanvas';
import { VoiceSwitcher } from './components/Voice/VoiceSwitcher';
import { SpeechBubble } from './components/Chat/SpeechBubble';
import { VoiceControls } from './components/Voice/VoiceControls';
import { ConversationFeed } from './components/Chat/ConversationFeed';
import { SettingsModal } from './components/Settings/SettingsModal';
import { Settings, History, VolumeX, Volume2, FolderGit2, AlertCircle, BellOff } from 'lucide-react';
import './styles/app.css';

export const App: React.FC = () => {
  const [characterState, setCharacterState] = useState<CharacterState>('idle');
  const [voiceGender, setVoiceGender] = useState<VoiceGender>('female');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [quietMode, setQuietMode] = useState(false);
  const [proactiveFrequency, setProactiveFrequency] = useState<ProactiveFrequency>('medium');
  const [currentText, setCurrentText] = useState<string>(
    'Heyyy! Enna panra? Coding ah? Illa summa time pass ah? 😂'
  );
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMouthOpen, setIsMouthOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<'ta-IN' | 'en-IN' | 'en-US'>('en-IN');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [contextSummary, setContextSummary] = useState<ProjectSummary | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const speechServiceRef = useRef<SpeechService | null>(null);

  useEffect(() => {
    speechServiceRef.current = new SpeechService();
    const vscode = getVsCodeApi();

    // Notify extension host that webview is mounted & ready
    vscode.postMessage({ type: 'ready' });

    // Handle messages coming from Extension Host
    const unsubscribe = subscribeToHostMessages((message: HostToWebviewMessage) => {
      switch (message.type) {
        case 'init':
          setVoiceGender(message.voiceGender);
          setHasApiKey(message.hasApiKey);
          setQuietMode(message.quietMode);
          if (message.proactiveFrequency) {
            setProactiveFrequency(message.proactiveFrequency);
          }
          if (message.contextSummary) {
            setContextSummary(message.contextSummary);
          }
          break;

        case 'contextUpdated':
          setContextSummary(message.summary);
          break;

        case 'frequencyChanged':
          setProactiveFrequency(message.frequency);
          break;

        case 'thinking':
          setIsThinking(true);
          setCharacterState('thinking');
          break;

        case 'characterReply': {
          setIsThinking(false);
          setCurrentText(message.text);
          setCharacterState(message.emotion);

          // Add to conversation history
          setMessages(prev => [
            ...prev,
            {
              id: Date.now().toString(),
              sender: 'character',
              text: message.text,
              timestamp: Date.now(),
              emotion: message.emotion,
            },
          ]);

          // Trigger speech playback if not quiet mode
          if (!quietMode && speechServiceRef.current) {
            const onStart = () => setIsSpeaking(true);
            const onViseme = (open: boolean) => setIsMouthOpen(open);
            const onEnd = () => {
              setIsSpeaking(false);
              setIsMouthOpen(false);
              setCharacterState('idle');
            };

            if (message.audioData) {
              speechServiceRef.current.playPcmAudio(message.audioData, 24000, onStart, onViseme, onEnd).then(ok => {
                if (!ok && speechServiceRef.current) {
                  speechServiceRef.current.speak(message.text, message.voiceGender || voiceGender, onStart, onViseme, onEnd);
                }
              });
            } else {
              speechServiceRef.current.speak(
                message.text,
                message.voiceGender || voiceGender,
                onStart,
                onViseme,
                onEnd
              );
            }
          } else {
            setTimeout(() => setCharacterState('idle'), 3500);
          }
          break;
        }

        case 'proactiveSpeech': {
          setCurrentText(message.text);
          setCharacterState(message.emotion);

          setMessages(prev => [
            ...prev,
            {
              id: Date.now().toString(),
              sender: 'character',
              text: message.text,
              timestamp: Date.now(),
              emotion: message.emotion,
              category: message.category,
            },
          ]);

          if (!quietMode && speechServiceRef.current) {
            const onStart = () => setIsSpeaking(true);
            const onViseme = (open: boolean) => setIsMouthOpen(open);
            const onEnd = () => {
              setIsSpeaking(false);
              setIsMouthOpen(false);
              setCharacterState('idle');
            };

            if (message.audioData) {
              speechServiceRef.current.playPcmAudio(message.audioData, 24000, onStart, onViseme, onEnd).then(ok => {
                if (!ok && speechServiceRef.current) {
                  speechServiceRef.current.speak(message.text, message.voiceGender || voiceGender, onStart, onViseme, onEnd);
                }
              });
            } else {
              speechServiceRef.current.speak(
                message.text,
                message.voiceGender || voiceGender,
                onStart,
                onViseme,
                onEnd
              );
            }
          } else {
            setTimeout(() => setCharacterState('idle'), 4000);
          }
          break;
        }

        case 'workspaceAlert': {
          setCurrentText(message.text);
          setCharacterState(message.emotion);

          setMessages(prev => [
            ...prev,
            {
              id: Date.now().toString(),
              sender: 'character',
              text: message.text,
              timestamp: Date.now(),
              emotion: message.emotion,
            },
          ]);

          if (!quietMode && speechServiceRef.current) {
            const onStart = () => setIsSpeaking(true);
            const onViseme = (open: boolean) => setIsMouthOpen(open);
            const onEnd = () => {
              setIsSpeaking(false);
              setIsMouthOpen(false);
              setCharacterState('idle');
            };

            if (message.audioData) {
              speechServiceRef.current.playPcmAudio(message.audioData, 24000, onStart, onViseme, onEnd).then(ok => {
                if (!ok && speechServiceRef.current) {
                  speechServiceRef.current.speak(message.text, message.voiceGender || voiceGender, onStart, onViseme, onEnd);
                }
              });
            } else {
              speechServiceRef.current.speak(
                message.text,
                message.voiceGender || voiceGender,
                onStart,
                onViseme,
                onEnd
              );
            }
          }
          break;
        }

        case 'apiKeyStatus':
          setHasApiKey(message.hasKey);
          if (message.hasKey) {
            setCurrentText('Mass! API Key connect aagiduchu! Ippo unga coding buddy ready! 🔥');
            setCharacterState('happy');
          }
          break;

        case 'voiceChanged':
          setVoiceGender(message.gender);
          break;

        case 'error':
          setIsThinking(false);
          setCurrentText(message.message);
          setCharacterState('confused');
          break;
      }
    });

    return () => {
      unsubscribe();
      if (speechServiceRef.current) {
        speechServiceRef.current.stopSpeaking();
        speechServiceRef.current.stopListening();
      }
    };
  }, [quietMode, voiceGender]);

  // Send message to Character / Gemini
  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    if (speechServiceRef.current) {
      speechServiceRef.current.stopSpeaking();
    }

    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: 'user',
        text,
        timestamp: Date.now(),
      },
    ]);

    setIsThinking(true);
    setCharacterState('thinking');

    getVsCodeApi().postMessage({
      type: 'sendMessage',
      text,
    });
  };

  // Explain Active Errors
  const handleExplainError = () => {
    setIsThinking(true);
    setCharacterState('thinking');
    getVsCodeApi().postMessage({ type: 'explainError' });
  };

  // Analyze Workspace Context
  const handleAnalyzeWorkspace = () => {
    setIsThinking(true);
    setCharacterState('thinking');
    getVsCodeApi().postMessage({ type: 'analyzeWorkspace' });
  };

  // Tell a Joke
  const handleTellJoke = () => {
    getVsCodeApi().postMessage({ type: 'tellJoke' });
  };

  // Set Proactive Chatter Frequency
  const handleSetFrequency = (frequency: ProactiveFrequency) => {
    setProactiveFrequency(frequency);
    getVsCodeApi().postMessage({ type: 'setFrequency', frequency });
  };

  // Toggle Microphone
  const handleToggleListen = () => {
    if (!speechServiceRef.current) return;

    if (isListening) {
      speechServiceRef.current.stopListening();
      setIsListening(false);
      setCharacterState('idle');
    } else {
      speechServiceRef.current.setLanguage(currentLang);
      const started = speechServiceRef.current.startListening({
        onStart: () => {
          setIsListening(true);
          setCharacterState('listening');
        },
        onResult: (transcript, isFinal) => {
          if (isFinal && transcript.trim()) {
            setIsListening(false);
            handleSendMessage(transcript.trim());
          }
        },
        onError: err => {
          setIsListening(false);
          setCharacterState('confused');
          setCurrentText(`Mic alert: ${err}`);
        },
        onEnd: () => {
          setIsListening(false);
          if (characterState === 'listening') {
            setCharacterState('idle');
          }
        },
      });

      if (!started) {
        setIsListening(false);
      }
    }
  };

  // Stop Character Speech (Interrupt support)
  const handleStopSpeaking = () => {
    if (speechServiceRef.current) {
      speechServiceRef.current.stopSpeaking();
    }
    setIsSpeaking(false);
    setIsMouthOpen(false);
    setCharacterState('idle');
  };

  // Switch Voice Persona
  const handleVoiceSwitch = (gender: VoiceGender) => {
    setVoiceGender(gender);
    getVsCodeApi().postMessage({ type: 'setVoice', gender });
    const greeting =
      gender === 'female'
        ? 'Heyyy! Naan Maya! Energetic-ah code pannuvoma? ✨'
        : 'Vanakkam bro! Naan Vikram! Tech bugs-ah therikka viduvom! 🚀';
    setCurrentText(greeting);
    setCharacterState('happy');

    if (!quietMode && speechServiceRef.current) {
      speechServiceRef.current.speak(
        greeting,
        gender,
        () => setIsSpeaking(true),
        open => setIsMouthOpen(open),
        () => {
          setIsSpeaking(false);
          setIsMouthOpen(false);
          setCharacterState('idle');
        }
      );
    }
  };

  // Save API Key
  const handleSaveApiKey = (key: string) => {
    getVsCodeApi().postMessage({ type: 'setApiKey', key });
  };

  // Clear History
  const handleClearHistory = () => {
    setMessages([]);
    getVsCodeApi().postMessage({ type: 'clearHistory' });
  };

  const errorCount = contextSummary?.diagnosticsSummary?.errorCount || 0;

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="top-header">
        <div className="brand-section">
          <div className="status-indicator-dot" />
          <span className="brand-title">AI BUDDY</span>
        </div>

        {/* Project Context Info Pill */}
        {contextSummary && (
          <div
            className="project-context-pill"
            onClick={handleAnalyzeWorkspace}
            title={`Active Project: ${contextSummary.projectName} (${contextSummary.primaryLanguage}) - Click to analyze`}
          >
            <FolderGit2 size={12} className="pill-icon" />
            <span className="pill-name">{contextSummary.projectName}</span>
            {errorCount > 0 && (
              <span className="error-badge">
                <AlertCircle size={10} />
                {errorCount}
              </span>
            )}
          </div>
        )}

        <div className="header-actions">
          {proactiveFrequency === 'off' && (
            <span className="proactive-muted-badge" title="Proactive Chatter is Muted">
              <BellOff size={13} />
            </span>
          )}
          <button
            className="icon-btn"
            onClick={() => setQuietMode(prev => !prev)}
            title={quietMode ? 'Quiet Mode ON (Muted)' : 'Sound ON'}
          >
            {quietMode ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <button
            className="icon-btn"
            onClick={() => setIsHistoryOpen(true)}
            title="Chat History"
          >
            <History size={15} />
          </button>
          <button
            className={`icon-btn ${!hasApiKey ? 'has-warning' : ''}`}
            onClick={() => setIsSettingsOpen(true)}
            title="Settings, Frequency & Privacy"
          >
            <Settings size={15} />
          </button>
        </div>
      </header>

      {/* Voice Character Persona Switcher */}
      <VoiceSwitcher gender={voiceGender} onSelect={handleVoiceSwitch} />

      {/* Animated Character Stage */}
      <div className="character-stage">
        <CharacterCanvas
          state={characterState}
          gender={voiceGender}
          isMouthOpen={isMouthOpen}
        />
      </div>

      {/* Speech Bubble & Quick Suggestions */}
      <SpeechBubble
        text={currentText}
        isThinking={isThinking}
        contextSummary={contextSummary}
        onSuggestionClick={handleSendMessage}
        onExplainError={handleExplainError}
        onAnalyzeWorkspace={handleAnalyzeWorkspace}
        onTellJoke={handleTellJoke}
      />

      {/* Voice & Chat Input Controls Panel */}
      <VoiceControls
        isListening={isListening}
        isSpeaking={isSpeaking}
        gender={voiceGender}
        currentLang={currentLang}
        onSendMessage={handleSendMessage}
        onToggleListen={handleToggleListen}
        onStopSpeaking={handleStopSpeaking}
        onLanguageChange={setCurrentLang}
      />

      {/* Chat History Drawer */}
      <ConversationFeed
        messages={messages}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onClear={handleClearHistory}
      />

      {/* Settings & Privacy Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        hasApiKey={hasApiKey}
        proactiveFrequency={proactiveFrequency}
        contextSummary={contextSummary}
        onClose={() => setIsSettingsOpen(false)}
        onSaveKey={handleSaveApiKey}
        onSetFrequency={handleSetFrequency}
      />
    </div>
  );
};
