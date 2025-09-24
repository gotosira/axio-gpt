import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import 'katex/dist/katex.min.css';
import { Bot, ThumbsUp, ThumbsDown } from "lucide-react";
import { ThoughtProcess } from "./ThoughtProcess";
import { useI18n } from "@/components/providers/I18nProvider";

interface MessageProps {
  role: "user" | "assistant";
  content: string;
  messageId?: string;
  feedback?: "like" | "dislike" | null;
  onFeedback?: (messageId: string, feedback: "like" | "dislike" | null) => void;
  onRightClick?: (event: React.MouseEvent, messageId: string) => void;
  onReply?: (messageId: string) => void;
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onCopy?: (content: string) => void;
  onOptions?: (event: React.MouseEvent, messageId: string) => void;
  assistantAvatarUrl?: string;
  thoughtProcess?: {
    thoughts: string[];
    duration?: number;
    isComplete?: boolean;
  };
}

export function Message({ 
  role, 
  content, 
  messageId,
  feedback,
  onFeedback,
  onRightClick,
  onReply,
  onRegenerate,
  onDelete,
  onCopy,
  onOptions,
  assistantAvatarUrl,
  thoughtProcess
}: MessageProps) {
  const { t } = useI18n();
  const currentTime = new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onRightClick && messageId) {
      onRightClick(e, messageId);
    }
  };

  const handleFeedback = (feedbackType: "like" | "dislike") => {
    if (onFeedback && messageId) {
      const newFeedback = feedback === feedbackType ? null : feedbackType;
      onFeedback(messageId, newFeedback);
    }
  };

  return (
    <div 
      className={`flex items-start gap-2 py-1 ${role === 'user' ? 'pl-10 pr-0' : 'pl-0 pr-10'} group`}
      onContextMenu={handleRightClick}
    >
            {role === 'assistant' && (
        <div className="avatar avatar-lg">
          {assistantAvatarUrl ? (
            <img
              src={assistantAvatarUrl}
              alt="Assistant"
              className="w-full h-full rounded-full object-cover border border-[#a6b0bf]"
              onError={(e) => {
                console.log('Message avatar failed to load:', assistantAvatarUrl);
                e.currentTarget.src = '/avatars/BaoBao.jpeg';
              }}
              onLoad={() => console.log('Message avatar loaded successfully:', assistantAvatarUrl)}
            />
          ) : (
            <div className="w-full h-full bg-[#f2f4f7] rounded-full flex items-center justify-center border border-[#a6b0bf]">
              <Bot size={18} className="text-[#344054]" />
            </div>
          )}
          <div className="avatar-status"></div>
        </div>
      )}
      
      <div className={`flex-1 ${role === 'user' ? 'flex justify-end' : ''}`}>
        <div className={`flex items-end gap-2 ${role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className={`chat-message-bubble ${role === 'user' ? 'user' : 'assistant'} relative`}>
            {/* Optional inline thinking panel: render if content embeds a block starting with :::thinking */}
            {role === 'assistant' && content.startsWith(':::thinking') && (
              <div className="thinking-panel">
                <div className="thinking-title">{t('thinking')}</div>
                <ul className="thinking-list">
                  {content
                    .split('\n')
                    .slice(1)
                    .filter((line) => line.trim().length > 0 && !line.startsWith(':::'))
                    .slice(0, 8)
                    .map((line, i) => (
                      <li key={i}>{line.replace(/^[-*]\s*/, '')}</li>
                    ))}
                </ul>
              </div>
            )}
            {/* Show thought process for assistant messages */}
            {role === 'assistant' && thoughtProcess && (
              <ThoughtProcess
                thoughts={thoughtProcess.thoughts}
                duration={thoughtProcess.duration}
                isComplete={thoughtProcess.isComplete}
              />
            )}
            
            <article className="chatgpt-msg">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkMath]} 
                rehypePlugins={[rehypeHighlight, rehypeKatex]}
                components={{
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  code: ({ className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    return !props.inline && match ? (
                      <pre className="codeblock">
                        <code className={className} {...props}>
                          {children}
                        </code>
                        <button 
                          className="copy-btn"
                          onClick={async (event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            try {
                              // Get the actual text content from the code element
                              const codeElement = (event.target as HTMLElement).parentElement?.querySelector('code');
                              let textToCopy = '';
                              
                              if (codeElement) {
                                textToCopy = codeElement.textContent || codeElement.innerText || '';
                              } else {
                                // Fallback: try to extract from children
                                const extractText = (element: any): string => {
                                  if (typeof element === 'string') return element;
                                  if (typeof element === 'number') return String(element);
                                  if (Array.isArray(element)) {
                                    return element.map(extractText).join('');
                                  }
                                  if (element && typeof element === 'object' && element.props) {
                                    return extractText(element.props.children);
                                  }
                                  return '';
                                };
                                textToCopy = extractText(children);
                              }
                              
                              // Clean up the text
                              textToCopy = textToCopy.replace(/\n$/, ''); // Remove trailing newline
                              
                              await navigator.clipboard.writeText(textToCopy);
                              
                              // Visual feedback
                              const button = event.target as HTMLButtonElement;
                              const originalText = button.textContent;
                              button.textContent = t('copied');
                              button.style.background = 'rgba(34, 197, 94, 0.2)';
                              button.style.color = '#22c55e';
                              
                              setTimeout(() => {
                                button.textContent = originalText;
                                button.style.background = '';
                                button.style.color = '';
                              }, 2000);
                            } catch (err) {
                              console.error('Failed to copy code:', err);
                              // Fallback for older browsers
                              const codeElement = (event.target as HTMLElement).parentElement?.querySelector('code');
                              const textArea = document.createElement('textarea');
                              textArea.value = codeElement?.textContent || codeElement?.innerText || '';
                              document.body.appendChild(textArea);
                              textArea.select();
                              document.execCommand('copy');
                              document.body.removeChild(textArea);
                            }
                          }}
                          title="Copy code"
                        >
                          {t('copy')}
                        </button>
                      </pre>
                    ) : (
                      <code {...props}>
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children }) => <>{children}</>,
                  p: ({ children }) => <p>{children}</p>,
                  ul: ({ children }) => <ul>{children}</ul>,
                  ol: ({ children }) => <ol>{children}</ol>,
                  h1: ({ children }) => <h1>{children}</h1>,
                  h2: ({ children }) => <h2>{children}</h2>,
                  h3: ({ children }) => <h3>{children}</h3>,
                  h4: ({ children }) => <h4>{children}</h4>,
                  h5: ({ children }) => <h5>{children}</h5>,
                  h6: ({ children }) => <h6>{children}</h6>,
                  blockquote: ({ children }) => (
                    <blockquote>
                      {children}
                    </blockquote>
                  ),
                  table: ({ children }) => (
                    <table>
                      {children}
                    </table>
                  ),
                  thead: ({ children }) => (
                    <thead>
                      {children}
                    </thead>
                  ),
                  tbody: ({ children }) => (
                    <tbody>
                      {children}
                    </tbody>
                  ),
                  th: ({ children }) => (
                    <th>
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td>
                      {children}
                    </td>
                  ),
                  tr: ({ children }) => (
                    <tr>
                      {children}
                    </tr>
                  ),
                  hr: () => <hr />,
                  a: ({ children, href, ...props }) => (
                    <a 
                      href={href} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                      {...props}
                    >
                      {children}
                    </a>
                  ),
                  strong: ({ children }) => <strong>{children}</strong>,
                  em: ({ children }) => <em>{children}</em>,
                  del: ({ children }) => <del>{children}</del>,
                  ins: ({ children }) => <ins>{children}</ins>,
                  mark: ({ children }) => <mark>{children}</mark>,
                  details: ({ children }) => <details>{children}</details>,
                  summary: ({ children }) => <summary>{children}</summary>,
                }}
              >
                {content}
              </ReactMarkdown>
            </article>
            
            {/* Feedback buttons for assistant messages */}
            {role === 'assistant' && (
              <div className="mt-2 flex gap-1 justify-end">
                {onFeedback && messageId && messageId !== '' && !messageId.startsWith('temp-') ? (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFeedback('like');
                      }}
                      className={`p-2 rounded hover:bg-gray-100 transition-colors ${
                        feedback === 'like' 
                          ? 'text-blue-600 bg-blue-50' 
                          : 'text-gray-400 hover:text-blue-600'
                      }`}
                      title={t('like')}
                    >
                      <ThumbsUp size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFeedback('dislike');
                      }}
                      className={`p-2 rounded hover:bg-gray-100 transition-colors ${
                        feedback === 'dislike' 
                          ? 'text-red-600 bg-red-50' 
                          : 'text-gray-400 hover:text-red-600'
                      }`}
                      title={t('dislike')}
                    >
                      <ThumbsDown size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (onOptions && messageId) onOptions(e, messageId); }}
                      className="p-2 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                      title={t('moreOptions')}
                    >
                      ···
                    </button>
                  </>
                ) : null}
              </div>
            )}
          </div>
          
          <div className={`flex flex-col h-9 items-end justify-end ${role === 'user' ? 'text-right' : ''}`}>
            {role === 'user' && (
              <div className="message-seen">{t('seen')}</div>
            )}
            <div className="message-time">{currentTime}</div>
          </div>
        </div>
      </div>
    </div>
  );
}


