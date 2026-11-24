export type CharacterState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'laughing'
  | 'happy'
  | 'confused'
  | 'surprised'
  | 'sad';

export type VoicePersona = 'small_boy' | 'vadivelu' | 'santhanam' | 'maya';
export type VoiceGender = VoicePersona | 'female' | 'male';

export type ProactiveFrequency = 'high' | 'medium' | 'low' | 'off';

export type ProactiveEventType =
  | 'TEST_PASSED'
  | 'TEST_FAILED'
  | 'BUG_FIXED'
  | 'REPEATED_ERROR'
  | 'LONG_CODING_BURST'
  | 'IDLE_CHECKIN'
  | 'RANDOM_JOKE'
  | 'TECH_DISCUSSION';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'character';
  text: string;
  timestamp: number;
  emotion?: CharacterState;
  category?: string;
}

export interface DiagnosticErrorItem {
  file: string;
  line: number;
  message: string;
  source?: string;
}

export interface ProjectSummary {
  projectName: string;
  projectType: string;
  frameworks: string[];
  testFramework?: string;
  primaryLanguage: string;
  activeFile?: {
    name: string;
    relativePath: string;
    languageId: string;
    lineCount: number;
    cursorLine?: number;
  };
  diagnosticsSummary: {
    errorCount: number;
    warningCount: number;
    topErrors: DiagnosticErrorItem[];
  };
  gitBranch?: string;
  lastUpdated: number;
}

export type WebviewToHostMessage =
  | { type: 'ready' }
  | { type: 'sendMessage'; text: string }
  | { type: 'setVoice'; gender: VoiceGender }
  | { type: 'setApiKey'; key: string }
  | { type: 'setElevenLabsApiKey'; key: string }
  | { type: 'checkApiKey' }
  | { type: 'clearHistory' }
  | { type: 'stateChanged'; state: CharacterState }
  | { type: 'analyzeWorkspace' }
  | { type: 'explainError' }
  | { type: 'tellJoke' }
  | { type: 'setFrequency'; frequency: ProactiveFrequency };

export type HostToWebviewMessage =
  | {
      type: 'init';
      voiceGender: VoiceGender;
      hasApiKey: boolean;
      hasElevenLabsKey?: boolean;
      quietMode: boolean;
      modelName: string;
      proactiveFrequency: ProactiveFrequency;
      contextSummary?: ProjectSummary;
    }
  | {
      type: 'characterReply';
      text: string;
      emotion: CharacterState;
      voiceGender: VoiceGender;
      audioData?: string;
    }
  | {
      type: 'proactiveSpeech';
      text: string;
      emotion: CharacterState;
      voiceGender: VoiceGender;
      category: string;
      audioData?: string;
    }
  | { type: 'thinking' }
  | { type: 'apiKeyStatus'; hasKey: boolean }
  | { type: 'elevenLabsApiKeyStatus'; hasKey: boolean }
  | { type: 'voiceChanged'; gender: VoiceGender }
  | { type: 'frequencyChanged'; frequency: ProactiveFrequency }
  | { type: 'contextUpdated'; summary: ProjectSummary }
  | {
      type: 'workspaceAlert';
      text: string;
      emotion: CharacterState;
      voiceGender: VoiceGender;
      audioData?: string;
    }
  | { type: 'error'; message: string };
