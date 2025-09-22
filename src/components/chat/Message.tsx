import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import 'katex/dist/katex.min.css';
import { Bot, ThumbsUp, ThumbsDown } from "lucide-react";

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
  assistantAvatarUrl
}: MessageProps) {
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
                <div className="thinking-title">Thinking…</div>
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
            <ReactMarkdown 
              remarkPlugins={[remarkGfm, remarkMath]} 
              rehypePlugins={[rehypeHighlight, rehypeKatex]}
              components={{
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                code: ({ className, children, ...props }: any) => {
                  const match = /language-(\w+)/.exec(className || '');
                  return !props.inline && match ? (
                    <pre className="msg-codeblock">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  ) : (
                    <code className="msg-inline-code" {...props}>
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => <>{children}</>,
                p: ({ children }) => <p className="msg-p">{children}</p>,
                ul: ({ children }) => <ul className="msg-ul">{children}</ul>,
                ol: ({ children }) => <ol className="msg-ol">{children}</ol>,
                // Do not override <li> to avoid listitem warnings
                // li: ({ children }) => <li className="msg-li">{children}</li>,
                h1: ({ children }) => <h1 className="msg-h1">{children}</h1>,
                h2: ({ children }) => <h2 className="msg-h2">{children}</h2>,
                h3: ({ children }) => <h3 className="msg-h3">{children}</h3>,
                blockquote: ({ children }) => (
                  <blockquote className="msg-quote">
                    {children}
                  </blockquote>
                ),
                table: ({ children }) => (
                  <div className="msg-table-wrap">
                    <table className="msg-table">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="msg-thead">
                    {children}
                  </thead>
                ),
                th: ({ children }) => (
                  <th className="msg-th">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="msg-td">
                    {children}
                  </td>
                ),
                tr: ({ children }) => (
                  <tr className="msg-tr">
                    {children}
                  </tr>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
            
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
                      title="ถูกใจ"
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
                      title="ไม่ถูกใจ"
                    >
                      <ThumbsDown size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (onOptions && messageId) onOptions(e, messageId); }}
                      className="p-2 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                      title="More options"
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
              <div className="message-seen">Seen</div>
            )}
            <div className="message-time">{currentTime}</div>
          </div>
        </div>
      </div>
    </div>
  );
}


