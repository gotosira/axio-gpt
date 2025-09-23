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
      greeting: 'สวัสดีจ้า เราชื่อ PungPung [ปังปัง] ',
      description: 'ผู้ช่วยให้งานของคุณปังขึ้นอีกหลายเท่า ✨ ด้วยความสามารถในการสรุปและวิเคราะห์ข้อมูล Product Feedback ถ้าพร้อมแล้วกดเลือกหัวข้อที่คุณอยากให้เราช่วยได้เลย!',
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
      greeting: 'ฮัลโหล~ เราชื่อ FlowFlow (โฟลวโฟลว) 🐙',
      description: 'เราเกิดมาเพื่อช่วยดีไซน์ UX/UI ให้ปัง สวย และตรงมาตรฐานของ AXONS! ไม่ว่าจะเป็น Web หรือ Mobile เราพร้อมแนะนำให้ใช้งานได้ลื่นทุกแพลตฟอร์มเลย 💻📱',
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
      <div className="w-24 h-24 rounded-full mb-6 overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-lg">
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
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        {assistant.name} - {assistant.title}
      </h1>


      {/* Greeting */}
      <div className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 text-center">
        {assistant.greeting}
      </div>

      {/* Description */}
      <div className="text-gray-700 dark:text-gray-300 mb-8 max-w-2xl text-center leading-relaxed">
        {assistant.description}
      </div>

      {/* Suggestions - Horizontal Layout */}
      <div className="w-full max-w-6xl">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 text-center">
            คำแนะนำสำหรับเริ่มต้น
          </h3>
          <div className="flex flex-wrap gap-3 justify-center">
            {assistant.suggestions.map((suggestion, index) => (
              <div key={index} className="flex-shrink-0">
                {typeof suggestion === 'string' ? (
                  <Button
                    variant="outline"
                    className="h-auto p-4 text-left justify-start border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 whitespace-normal transition-all duration-200 shadow-sm hover:shadow-md"
                    onClick={() => onSuggestionClick(suggestion)}
                  >
                    <span className="text-sm max-w-xs text-gray-800 dark:text-gray-200 leading-relaxed">{suggestion}</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="h-auto p-4 text-left justify-start border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 shadow-sm hover:shadow-md"
                    onClick={() => onSuggestionClick(`${suggestion.text} ${suggestion.subtext}`)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{suggestion.icon}</span>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{suggestion.text}</span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">{suggestion.subtext}</span>
                      </div>
                    </div>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
