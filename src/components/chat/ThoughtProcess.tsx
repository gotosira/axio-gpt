"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Clock, CheckCircle } from "lucide-react";

interface ThoughtProcessProps {
  thoughts: string[];
  duration?: number;
  isComplete?: boolean;
  onComplete?: () => void;
}

export function ThoughtProcess({ 
  thoughts, 
  duration, 
  isComplete = false,
  onComplete 
}: ThoughtProcessProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [visibleThoughts, setVisibleThoughts] = useState<string[]>([]);

  React.useEffect(() => {
    if (thoughts.length === 0) return;

    // Show thoughts one by one with a delay
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < thoughts.length) {
        setVisibleThoughts(prev => [...prev, thoughts[currentIndex]]);
        currentIndex++;
      } else {
        clearInterval(interval);
        if (onComplete) {
          setTimeout(onComplete, 500); // Small delay before calling onComplete
        }
      }
    }, 800); // 800ms delay between each thought

    return () => clearInterval(interval);
  }, [thoughts, onComplete]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="thought-process-container mb-4">
      <div 
        className="thought-process-header cursor-pointer flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 flex-1">
          {isExpanded ? (
            <ChevronDown size={16} className="text-gray-500" />
          ) : (
            <ChevronRight size={16} className="text-gray-500" />
          )}
          <Clock size={16} className="text-gray-500" />
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Thought for {duration ? formatDuration(duration) : '...'}
          </span>
        </div>
        
        {isComplete && (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <CheckCircle size={16} />
            <span className="text-sm font-medium">Done</span>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="thought-process-content mt-2 ml-6 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
          <ul className="space-y-2">
            {visibleThoughts.map((thought, index) => (
              <li 
                key={index}
                className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed animate-fadeIn"
                style={{
                  animationDelay: `${index * 0.1}s`
                }}
              >
                {thought}
              </li>
            ))}
            
            {/* Show typing indicator for remaining thoughts */}
            {visibleThoughts.length < thoughts.length && (
              <li className="text-gray-400 dark:text-gray-500 text-sm italic">
                <span className="animate-pulse">Thinking...</span>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// CSS for the fade-in animation
const styles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.5s ease-out forwards;
    opacity: 0;
  }
  
  .thought-process-container {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
