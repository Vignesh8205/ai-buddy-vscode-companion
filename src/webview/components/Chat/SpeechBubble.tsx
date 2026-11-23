import React from 'react';
import { Sparkles, AlertTriangle, Terminal, Code2, Laugh } from 'lucide-react';
import { ProjectSummary } from '../../../shared/types';

interface SpeechBubbleProps {
  text: string;
  isThinking: boolean;
  contextSummary?: ProjectSummary | null;
  onSuggestionClick: (suggestion: string) => void;
  onExplainError?: () => void;
  onAnalyzeWorkspace?: () => void;
  onTellJoke?: () => void;
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({
  text,
  isThinking,
  contextSummary,
  onSuggestionClick,
  onExplainError,
  onAnalyzeWorkspace,
  onTellJoke,
}) => {
  const hasErrors = (contextSummary?.diagnosticsSummary?.errorCount || 0) > 0;
  const isPlaywright = contextSummary?.testFramework === 'Playwright';
  const activeFileName = contextSummary?.activeFile?.name;

  return (
    <div className="speech-bubble-wrapper">
      <div className="speech-bubble">
        {isThinking ? (
          <div className="thinking-dots">
            <span className="dot dot-1" />
            <span className="dot dot-2" />
            <span className="dot dot-3" />
          </div>
        ) : (
          <div className="speech-text">{text}</div>
        )}
        <div className="bubble-tail" />
      </div>

      {/* Dynamic Context-Aware Suggestion Chips */}
      <div className="suggestion-chips-row">
        {/* If errors are active in project, highlight error explanation chip */}
        {hasErrors && (
          <button
            className="suggestion-chip alert-chip"
            onClick={onExplainError}
            title="Explain active diagnostic error"
          >
            <AlertTriangle size={11} className="chip-icon error" />
            <span>Explain error ({contextSummary?.diagnosticsSummary.errorCount})</span>
          </button>
        )}

        {/* Project Analysis Chip */}
        <button
          className="suggestion-chip"
          onClick={onAnalyzeWorkspace}
          title="Analyze current workspace context"
        >
          <Code2 size={11} className="chip-icon code" />
          <span>Analyze Project</span>
        </button>

        {/* Programmer Joke Chip */}
        <button
          className="suggestion-chip joke-chip"
          onClick={onTellJoke}
          title="Tell a humorous coding joke"
        >
          <Laugh size={11} className="chip-icon joke" />
          <span>Dev Joke 😂</span>
        </button>

        {/* Playwright specific chip */}
        {isPlaywright && (
          <button
            className="suggestion-chip"
            onClick={() => onSuggestionClick("Playwright tests pathi explain pannu!")}
            title="Discuss Playwright tests"
          >
            <Terminal size={11} className="chip-icon terminal" />
            <span>Playwright Tests</span>
          </button>
        )}

        {/* Active file specific prompt */}
        {activeFileName && (
          <button
            className="suggestion-chip"
            onClick={() => onSuggestionClick(`Intha ${activeFileName} file code eppadi irukku?`)}
            title={`Review ${activeFileName}`}
          >
            <Sparkles size={11} className="chip-icon" />
            <span>Review {activeFileName.length > 14 ? activeFileName.slice(0, 11) + '...' : activeFileName}</span>
          </button>
        )}
      </div>
    </div>
  );
};
