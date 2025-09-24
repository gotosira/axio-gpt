import React from 'react';

interface ContextUsageProps {
  messages: Array<{ role: string; content: string }>;
  assistantId?: string;
  maxTokens?: number;
}

// Simple token estimation function (rough approximation)
const estimateTokens = (text: string): number => {
  // Rough estimation: ~4 characters per token for English text
  // For Thai/mixed content, it's typically higher
  const thaiRatio = (text.match(/[\u0E00-\u0E7F]/g) || []).length / text.length;
  const avgCharsPerToken = thaiRatio > 0.3 ? 2.5 : 4; // Thai uses more tokens per character
  
  return Math.ceil(text.length / avgCharsPerToken);
};

const ContextUsage: React.FC<ContextUsageProps> = ({ 
  messages, 
  assistantId, 
  maxTokens = 128000 // Default for GPT-4
}) => {
  // Calculate total tokens used
  const totalTokens = messages.reduce((acc, message) => {
    return acc + estimateTokens(message.content);
  }, 0);

  // Calculate percentage
  const usagePercentage = Math.min((totalTokens / maxTokens) * 100, 100);

  // Get assistant-specific context limits
  const getAssistantContext = (assistantId?: string) => {
    switch (assistantId) {
      case 'asst_sS0Sa5rqQFrrwnwkJ9mULGp0': // BaoBao
        return { maxTokens: 128000, name: 'BaoBao' };
      case 'asst_CO7qtWO5QTfgV0Gyv77XQY8q': // DeeDee
        return { maxTokens: 128000, name: 'DeeDee' };
      case 'asst_Pi6FrBRHRpvhwSOIryJvDo3T': // PungPung
        return { maxTokens: 128000, name: 'PungPung' };
      case 'asst_4nCaYlt7AA5Ro4pseDCTbKHO': // FlowFlow
        return { maxTokens: 128000, name: 'FlowFlow' };
      case 'group':
        return { maxTokens: 128000, name: 'Group Chat' };
      default:
        return { maxTokens: 128000, name: 'AI Assistant' };
    }
  };

  const assistantContext = getAssistantContext(assistantId);
  const adjustedPercentage = Math.min((totalTokens / assistantContext.maxTokens) * 100, 100);

  // Color coding based on usage
  const getUsageColor = (percentage: number) => {
    if (percentage < 50) return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
    if (percentage < 75) return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
    if (percentage < 90) return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/20';
    return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
  };

  const usageColor = getUsageColor(adjustedPercentage);

  // Format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  return (
    <div className="context-usage flex items-center gap-2 text-xs">
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 relative overflow-hidden">
          <div 
            className="absolute inset-0 rounded-full transition-all duration-300"
            style={{
              background: adjustedPercentage < 50 ? '#10b981' : 
                          adjustedPercentage < 75 ? '#f59e0b' : 
                          adjustedPercentage < 90 ? '#f97316' : '#ef4444',
              transform: `rotate(${(adjustedPercentage / 100) * 360}deg)`,
              clipPath: 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%)'
            }}
          />
        </div>
        <span className="font-medium text-gray-600 dark:text-gray-400">
          {adjustedPercentage.toFixed(1)}%
        </span>
      </div>
      
      <div className={`px-2 py-1 rounded-full font-medium ${usageColor}`}>
        {formatNumber(totalTokens)}/{formatNumber(assistantContext.maxTokens)} tokens
      </div>
      
      {adjustedPercentage > 75 && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          ⚠️ High usage
        </div>
      )}
    </div>
  );
};

export default ContextUsage;
