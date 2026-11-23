import React from 'react';
import { ChatMessage } from '../../../shared/types';
import { MessageSquare, Trash2 } from 'lucide-react';

interface ConversationFeedProps {
  messages: ChatMessage[];
  isOpen: boolean;
  onClose: () => void;
  onClear: () => void;
}

export const ConversationFeed: React.FC<ConversationFeedProps> = ({
  messages,
  isOpen,
  onClose,
  onClear,
}) => {
  if (!isOpen) return null;

  return (
    <div className="conversation-drawer-backdrop" onClick={onClose}>
      <div className="conversation-drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title">
            <MessageSquare size={16} />
            <span>Conversation History</span>
          </div>
          <div className="drawer-actions">
            <button className="icon-btn-danger" onClick={onClear} title="Clear history">
              <Trash2 size={14} />
            </button>
            <button className="icon-btn-close" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="messages-list">
          {messages.length === 0 ? (
            <div className="empty-messages">
              <p>No conversations yet.</p>
              <p className="subtext">Speak or tap the suggestions to chat with AI Buddy!</p>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`message-item ${msg.sender}`}>
                <div className="message-avatar">
                  {msg.sender === 'character' ? '🤖' : '👤'}
                </div>
                <div className="message-bubble-content">
                  <div className="message-body">{msg.text}</div>
                  <div className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
