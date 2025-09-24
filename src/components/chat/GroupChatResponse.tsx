import React, { useState } from 'react';

interface GroupChatResponseProps {
  response: {
    userQuestion: string;
    initialThoughts: Array<{
      assistantId: string;
      name: string;
      avatar: string;
      role: string;
      initialThought: string;
    }>;
    crossDiscussion: Array<{
      assistantId: string;
      name: string;
      avatar: string;
      discussion: string;
    }>;
    finalAnswer: string;
    timestamp: string;
  };
}

const GroupChatResponse: React.FC<GroupChatResponseProps> = ({ response }) => {
  const [activeSection, setActiveSection] = useState<'initial' | 'discussion' | 'final'>('final');
  const [expandedThoughts, setExpandedThoughts] = useState<Set<number>>(new Set());

  const toggleThoughtExpansion = (index: number) => {
    setExpandedThoughts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="group-chat-response">
      {/* Navigation Tabs */}
      <div className="group-chat-tabs">
        <button
          className={`group-chat-tab ${activeSection === 'initial' ? 'active' : ''}`}
          onClick={() => setActiveSection('initial')}
        >
          <span className="tab-icon">💭</span>
          Initial Thoughts
        </button>
        <button
          className={`group-chat-tab ${activeSection === 'discussion' ? 'active' : ''}`}
          onClick={() => setActiveSection('discussion')}
        >
          <span className="tab-icon">💬</span>
          Team Discussion
        </button>
        <button
          className={`group-chat-tab ${activeSection === 'final' ? 'active' : ''}`}
          onClick={() => setActiveSection('final')}
        >
          <span className="tab-icon">✨</span>
          Final Answer
        </button>
      </div>

      {/* Content Area */}
      <div className="group-chat-content">
        {activeSection === 'initial' && (
          <div className="initial-thoughts-section">
            <div className="section-header">
              <h3>🤔 Initial Analysis</h3>
              <p className="section-description">
                Each AI provides their initial thoughts and perspectives on your question
              </p>
            </div>
            
            <div className="thoughts-grid">
              {response.initialThoughts.map((thought, index) => (
                <div key={index} className="thought-card">
                  <div className="thought-header">
                    <div className="ai-avatar">{thought.avatar}</div>
                    <div className="ai-info">
                      <div className="ai-name">{thought.name}</div>
                      <div className="ai-role">{thought.role}</div>
                    </div>
                  </div>
                  
                  <div className="thought-content">
                    {expandedThoughts.has(index) ? (
                      <div className="thought-text full">{thought.initialThought}</div>
                    ) : (
                      <div className="thought-text truncated">
                        {truncateText(thought.initialThought)}
                      </div>
                    )}
                    
                    {thought.initialThought.length > 200 && (
                      <button
                        className="expand-button"
                        onClick={() => toggleThoughtExpansion(index)}
                      >
                        {expandedThoughts.has(index) ? 'Show Less' : 'Read More'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'discussion' && (
          <div className="discussion-section">
            <div className="section-header">
              <h3>💬 Team Discussion</h3>
              <p className="section-description">
                The AI team discusses and builds upon each other's ideas
              </p>
            </div>
            
            <div className="discussion-timeline">
              {response.crossDiscussion.map((discussion, index) => (
                <div key={index} className="discussion-item">
                  <div className="discussion-header">
                    <div className="ai-avatar">{discussion.avatar}</div>
                    <div className="ai-name">{discussion.name}</div>
                    <div className="discussion-time">
                      Round {index + 1}
                    </div>
                  </div>
                  
                  <div className="discussion-content">
                    {discussion.discussion}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'final' && (
          <div className="final-answer-section">
            <div className="section-header">
              <h3>✨ Collaborative Final Answer</h3>
              <p className="section-description">
                Synthesized response combining insights from all AI team members
              </p>
            </div>
            
            <div className="final-answer-content">
              <div className="final-answer-text">
                {response.finalAnswer.split('\n').map((paragraph, index) => (
                  <p key={index} className="answer-paragraph">
                    {paragraph}
                  </p>
                ))}
              </div>
              
              <div className="collaboration-footer">
                <div className="team-summary">
                  <strong>Collaborative effort by:</strong>
                  <div className="team-members">
                    {response.initialThoughts.map((thought, index) => (
                      <span key={index} className="team-member">
                        {thought.avatar} {thought.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="response-time">
                  Generated: {new Date(response.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .group-chat-response {
          max-width: 100%;
          margin: 1rem 0;
        }

        .group-chat-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 0.5rem;
        }

        .group-chat-tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border: none;
          background: transparent;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
          color: #6b7280;
        }

        .group-chat-tab:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .group-chat-tab.active {
          background: #3b82f6;
          color: white;
        }

        .tab-icon {
          font-size: 1.1rem;
        }

        .group-chat-content {
          min-height: 300px;
        }

        .section-header {
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .section-header h3 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 0.5rem;
        }

        .section-description {
          color: #6b7280;
          font-size: 0.95rem;
        }

        .thoughts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
        }

        .thought-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 1.25rem;
          transition: all 0.2s ease;
        }

        .thought-card:hover {
          border-color: #3b82f6;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .thought-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .ai-avatar {
          font-size: 1.5rem;
          width: 2.5rem;
          height: 2.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border-radius: 50%;
          border: 2px solid #e5e7eb;
        }

        .ai-info {
          flex: 1;
        }

        .ai-name {
          font-weight: 600;
          color: #111827;
          font-size: 1rem;
        }

        .ai-role {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .thought-text {
          line-height: 1.6;
          color: #374151;
        }

        .thought-text.truncated {
          color: #6b7280;
        }

        .expand-button {
          margin-top: 0.75rem;
          padding: 0.375rem 0.75rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .expand-button:hover {
          background: #2563eb;
        }

        .discussion-timeline {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .discussion-item {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 1.25rem;
          position: relative;
        }

        .discussion-item::before {
          content: '';
          position: absolute;
          left: -1px;
          top: 0;
          bottom: 0;
          width: 4px;
          background: #3b82f6;
          border-radius: 0 2px 2px 0;
        }

        .discussion-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .discussion-time {
          margin-left: auto;
          background: #e5e7eb;
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .discussion-content {
          line-height: 1.6;
          color: #374151;
        }

        .final-answer-content {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 1px solid #bae6fd;
          border-radius: 0.75rem;
          padding: 2rem;
        }

        .final-answer-text {
          margin-bottom: 2rem;
        }

        .answer-paragraph {
          margin-bottom: 1rem;
          line-height: 1.7;
          color: #0f172a;
          font-size: 1rem;
        }

        .collaboration-footer {
          border-top: 1px solid #bae6fd;
          padding-top: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .team-summary {
          flex: 1;
          min-width: 200px;
        }

        .team-summary strong {
          color: #0f172a;
          font-weight: 600;
          display: block;
          margin-bottom: 0.5rem;
        }

        .team-members {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .team-member {
          background: white;
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.875rem;
          color: #0f172a;
          border: 1px solid #bae6fd;
        }

        .response-time {
          color: #64748b;
          font-size: 0.875rem;
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .thought-card, .discussion-item {
            background: #1f2937;
            border-color: #374151;
          }

          .section-header h3 {
            color: #f9fafb;
          }

          .section-description {
            color: #9ca3af;
          }

          .ai-name {
            color: #f9fafb;
          }

          .ai-role {
            color: #9ca3af;
          }

          .thought-text, .discussion-content {
            color: #d1d5db;
          }

          .thought-text.truncated {
            color: #9ca3af;
          }

          .final-answer-content {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            border-color: #334155;
          }

          .answer-paragraph {
            color: #f1f5f9;
          }

          .collaboration-footer {
            border-color: #334155;
          }

          .team-summary strong {
            color: #f1f5f9;
          }

          .team-member {
            background: #334155;
            color: #f1f5f9;
            border-color: #475569;
          }

          .response-time {
            color: #94a3b8;
          }
        }
      `}</style>
    </div>
  );
};

export default GroupChatResponse;
