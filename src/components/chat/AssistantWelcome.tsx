"use client";

import { Button } from "@/components/ui/button";

interface AssistantWelcomeProps {
  assistantId: string;
  onSuggestionClick: (suggestion: string) => void;
}

export function AssistantWelcome({ assistantId, onSuggestionClick }: AssistantWelcomeProps) {
  const assistants = {
    'asst_sS0Sa5rqQFrrwnwkJ9mULGp0': { // BaoBao
      name: 'BaoBao',
      title: 'UX Writer',
      avatar: '/avatars/BaoBao.jpeg',
      author: 'community builder',
      model: 'GPT-5 Thinking',
      greeting: 'สวัสดี! 👋',
      description: 'BaoBao เป็น UX Writer ที่มาพร้อมภารกิจช่วยให้ข้อความในระบบของคุณชัดเจน ตรงประเด็น และเหมาะสมกับกลุ่มผู้ใช้ ไม่ว่าจะเป็น เกษตรกร (Farmer), ทีมหลังบ้าน (Back Office), ทีมหน้าบ้าน (Frontline), หรือผู้เชี่ยวชาญ (Specialist) 🎯',
      suggestions: [
        'BaoBao ช่วยคิดคำ บนหน้า UI ให้หน่อยสิ',
        'BaoBao เด่วฉันจะ พิมพ์ข้อความไปให้ ช่วยรีวิวให้หน่อย',
        'BaoBao ช่วยบอก ความแตกต่างการใช้ ภาษา ระหว่างกลุ่มผู้...',
        'BaoBao แปล ข้อความใน Mockup เป็นภาษาอังกฤษ ที่...'
      ]
    },
    'asst_CO7qtWO5QTfgV0Gyv77XQY8q': { // DeeDee
      name: 'DeeDee',
      title: 'UX Research',
      avatar: '/avatars/DeeDee.png',
      author: 'chanitha boontarak',
      greeting: 'สวัสดีค่ะ เราชื่อ DeeDee [ดีดี]',
      description: 'เราพร้อมจะให้ข้อมูลเบื้องต้นกับคุณ เป็นผู้ช่วยในการเตรียมตัวให้งานด้าน UX ของคุณผ่านไปได้ด้วยดี ❤️ ถ้าพร้อมแล้วกดเลือกหัวข้อเริ่มต้นที่คุณมีได้เลย!',
      suggestions: [
        'ฉันมีแค่คำอธิบายของ ระบบนี้ให้ DeeDee',
        'ฉันมี UI มา ให้ DeeDee ดู',
        'ฉันมี Objective อยู่ แล้วหละ DeeDee'
      ]
    },
    'asst_Pi6FrBRHRpvhwSOIryJvDo3T': { // PungPung
      name: 'PungPung',
      title: 'UX Analyst',
      avatar: '/avatars/PungPung.png',
      author: 'chanitha boontarak',
      greeting: 'Hello! My name is PungPung [ปังปัง]',
      description: 'your assistant to make your work many times more "Pung" (awesome/successful) ✨ with the ability to summarize and analyze Product Feedback data. If you\'re ready, click on the topic you want us to help with!',
      suggestions: [
        { text: 'สรุปข้อมูล', subtext: 'Feedback', icon: '💬' },
        { text: 'สรุปข้อมูล', subtext: 'คะแนน CSAT', icon: '⭐' }
      ]
    },
    'asst_4nCaYlt7AA5Ro4pseDCTbKHO': { // FlowFlow
      name: 'FlowFlow',
      title: 'UX/UI Designer',
      avatar: '/avatars/FlowFlow.jpeg',
      author: 'community builder',
      model: 'GPT-5',
      greeting: 'Hello~ We are FlowFlow (FlowFlow) 🐙',
      description: 'We were born to help design UX/UI to be awesome, beautiful, and meet AXONS standards! Whether it\'s Web or Mobile, we are ready to recommend smooth usage on all platforms 💻',
      suggestions: [
        'ช่วยค้นหาหรือ แนะนำ System Icon ให้ฉันหน่อย',
        'เด๋วจะส่ง Mockup ให้ ช่วยรีวิวหน่อยจ้า',
        'อยากให้ช่วยร่าง Wireframe ให้หน่อย',
        'ขอลิงค์ Design Template หน่อยครับ'
      ]
    }
  };

  const assistant = assistants[assistantId as keyof typeof assistants];

  if (!assistant) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-12">
      {/* Avatar */}
      <div className="w-24 h-24 rounded-full mb-6 overflow-hidden border-2 border-gray-200">
        <img
          src={assistant.avatar}
          alt={assistant.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = '/avatars/BaoBao.jpeg';
          }}
        />
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        {assistant.name} - {assistant.title}
      </h1>

      {/* Author */}
      <div className="flex items-center gap-1 text-gray-600 mb-4">
        <span className="text-sm">By {assistant.author}</span>
        <span className="text-xs">👤</span>
      </div>

      {/* Model Info */}
      {assistant.model && (
        <div className="flex items-center gap-1 text-gray-600 mb-6">
          <span className="text-sm">✓ Using the creator's recommended model: {assistant.model}</span>
        </div>
      )}

      {/* Greeting */}
      <div className="text-lg font-medium text-gray-900 mb-4 text-center">
        {assistant.greeting}
      </div>

      {/* Description */}
      <div className="text-gray-700 mb-8 max-w-2xl text-center leading-relaxed">
        {assistant.description}
      </div>

      {/* Suggestions */}
      <div className="grid gap-3 w-full max-w-4xl">
        {assistant.suggestions.map((suggestion, index) => (
          <div key={index} className="flex justify-center">
            {typeof suggestion === 'string' ? (
              <Button
                variant="outline"
                className="w-full max-w-md h-auto p-4 text-left justify-start border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                onClick={() => onSuggestionClick(suggestion)}
              >
                <span className="text-sm">{suggestion}</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full max-w-md h-auto p-4 text-left justify-start border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                onClick={() => onSuggestionClick(`${suggestion.text} ${suggestion.subtext}`)}
              >
                <div className="flex items-center gap-3 w-full">
                  <span className="text-2xl">{suggestion.icon}</span>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{suggestion.text}</span>
                    <span className="text-xs text-gray-600">{suggestion.subtext}</span>
                  </div>
                </div>
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
