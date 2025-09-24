import React from 'react';

interface GroupChatWelcomeProps {
  onSuggestionClick: (suggestion: string) => void;
  recentConversations?: Array<{
    id: string;
    title: string;
    updatedAt: string;
    messageCount: number;
  }>;
  onConversationClick: (conversationId: string) => void;
}

const GroupChatWelcome: React.FC<GroupChatWelcomeProps> = ({ 
  onSuggestionClick, 
  recentConversations = [], 
  onConversationClick 
}) => {
  const suggestions = [
    'ช่วยออกแบบ warehouse dashboard',
    'วิเคราะห์ข้อมูลการใช้งานระบบ',
    'สร้าง UI/UX สำหรับ mobile app',
    'แปลเอกสารเป็นภาษาอังกฤษ',
    'วิจัยพฤติกรรมผู้ใช้',
    'ออกแบบระบบจัดการสินค้า'
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-12">
      {/* Group Chat Avatar */}
      <div className="w-24 h-24 rounded-full mb-6 overflow-hidden border-2 border-orange-200 dark:border-orange-700 shadow-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
        <span className="text-4xl">🎉</span>
      </div>

      {/* Title and Description */}
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Group Chat
      </h1>
      <div className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 text-center">
        All AIs Working Together
      </div>
      <div className="text-gray-700 dark:text-gray-300 mb-8 max-w-2xl text-center leading-relaxed">
        ทุก AI จะทำงานร่วมกันอย่างเป็นระบบเพื่อตอบคำถามของคุณ<br/>
        <strong>ขั้นตอนการทำงาน:</strong><br/>
        1. 💭 <strong>Initial Analysis</strong> - แต่ละ AI ให้ความเห็นเบื้องต้น<br/>
        2. 💬 <strong>Team Discussion</strong> - AIs อภิปรายและเสริมความคิดซึ่งกันและกัน<br/>
        3. ✨ <strong>Final Answer</strong> - สรุปคำตอบสุดท้ายจากทีม AI ทั้งหมด<br/>
        BaoBao, DeeDee, PungPung, และ FlowFlow พร้อมช่วยเหลือ!
      </div>

      <div className="w-full max-w-4xl space-y-8">
        {/* AI Team Members */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 text-center">
            AI Team Members
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center mb-2">
                <span className="text-2xl">🍼</span>
              </div>
              <div className="text-sm font-medium text-blue-900 dark:text-blue-100">BaoBao</div>
              <div className="text-xs text-blue-700 dark:text-blue-300">Content & Translation</div>
            </div>
            <div className="flex flex-col items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center mb-2">
                <span className="text-2xl">🔬</span>
              </div>
              <div className="text-sm font-medium text-green-900 dark:text-green-100">DeeDee</div>
              <div className="text-xs text-green-700 dark:text-green-300">UX Research</div>
            </div>
            <div className="flex flex-col items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-800 flex items-center justify-center mb-2">
                <span className="text-2xl">📊</span>
              </div>
              <div className="text-sm font-medium text-purple-900 dark:text-purple-100">PungPung</div>
              <div className="text-xs text-purple-700 dark:text-purple-300">Data Analysis</div>
            </div>
            <div className="flex flex-col items-center p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-800 flex items-center justify-center mb-2">
                <span className="text-2xl">🎨</span>
              </div>
              <div className="text-sm font-medium text-pink-900 dark:text-pink-100">FlowFlow</div>
              <div className="text-xs text-pink-700 dark:text-pink-300">UX/UI Design</div>
            </div>
          </div>
        </div>

        {/* Recent Conversations */}
        {recentConversations.length > 0 && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Recent Group Conversations
            </h3>
            <div className="space-y-2">
              {recentConversations.slice(0, 5).map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => onConversationClick(conversation.id)}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {conversation.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {conversation.messageCount} messages • {new Date(conversation.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="ml-2 text-xs text-gray-400">
                      →
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Start Suggestions */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 text-center">
            Quick Start Suggestions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSuggestionClick(suggestion)}
                className="p-3 text-left border border-gray-300 dark:border-gray-600 rounded-lg hover:border-orange-500 dark:hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <div className="text-sm text-gray-800 dark:text-gray-200">
                  {suggestion}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Exit Group Chat */}
        <div className="text-center">
          <button
            onClick={() => {
              // This will be handled by the parent component
              window.location.reload();
            }}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline"
          >
            ออกจากโหมด Group Chat
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupChatWelcome;
