"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Locale = "en" | "th";

type Messages = Record<string, string>;

const en: Messages = {
  welcomeBack: "Welcome Back",
  signInToContinue: "Sign in to continue using {app}",
  email: "Email",
  password: "Password",
  remember: "Remember",
  forgotPassword: "Forgot password?",
  login: "Log in",
  noAccount: "Don't have an account?",
  signUp: "Sign up",
  createAccount: "Create Account",
  signUpLead: "Sign up to start using {app}",
  fullName: "Full Name",
  confirmPassword: "Confirm Password",
  createAccountCta: "Create Account",
  alreadyHave: "Already have an account?",
  signIn: "Sign in",
  model: "Model",
  systemPromptPlaceholder: "System prompt (optional)",
  toggleTheme: "Toggle theme",
  copy: "Copy",
  copied: "Copied!",
  thinking: "Thinking…",
  seen: "Seen",
  like: "Like",
  dislike: "Dislike",
  moreOptions: "More options",
  conversations: "Conversations",
  newChat: "New chat",
  noConversations: "No conversations",
  reply: "Reply",
  regenerate: "Regenerate",
  delete: "Delete",
  placeholderAsk: "Ask another question...",
  voiceInput: "Voice input",
  sendMessage: "Send message",
  renameConversation: "Rename conversation",
  generateBetterTitle: "Generate better title",
  deleteConversation: "Delete conversation",
  tryAgain: "Try again",
  addDetails: "Add details",
  moreConcise: "More concise",
  searchTheWeb: "Search the web",
  newChatUI: "New Chat",
  online: "Online",
  theme: "Theme",
  preferences: "Preferences",
  soundEffects: "Sound effects",
  notifications: "Notifications",
  light: "light",
  dark: "dark",
  system: "system",
  searchChats: "Search chats",
  pageNotFound: "Page not found",
  pageNotFoundLead: "The page you’re looking for doesn’t exist or has been moved.",
  goHome: "Go back home",
  cmdPlaceholder: "Search or ask a question in {app}...",
  quickActions: "Quick Actions",
  qaNewChatWithBaoBao: "New chat with BaoBao",
  qaFindInvoice: "Find 'invoice' in chats",
  qaUploadPdf: "Upload a PDF",
  whosChatting: "Who's chatting?",
  cancel: "Cancel",
  disclaimer: "AXONS AI may display inaccurate information and does not represent the views of others. Please double-check details before relying on them.",
};

const th: Messages = {
  welcomeBack: "ยินดีต้อนรับกลับ",
  signInToContinue: "ลงชื่อเข้าใช้เพื่อใช้งาน {app}",
  email: "อีเมล",
  password: "รหัสผ่าน",
  remember: "จดจำข้อมูล",
  forgotPassword: "ลืมรหัสผ่าน?",
  login: "เข้าสู่ระบบ",
  noAccount: "ยังไม่มีบัญชี?",
  signUp: "สมัครสมาชิก",
  createAccount: "สร้างบัญชี",
  signUpLead: "สมัครเพื่อเริ่มใช้งาน {app}",
  fullName: "ชื่อ-นามสกุล",
  confirmPassword: "ยืนยันรหัสผ่าน",
  createAccountCta: "สร้างบัญชี",
  alreadyHave: "มีบัญชีอยู่แล้ว?",
  signIn: "เข้าสู่ระบบ",
  model: "โมเดล",
  systemPromptPlaceholder: "พรอมต์ระบบ (ไม่บังคับ)",
  toggleTheme: "สลับธีม",
  copy: "คัดลอก",
  copied: "คัดลอกแล้ว!",
  thinking: "กำลังคิด…",
  seen: "เห็นแล้ว",
  like: "ถูกใจ",
  dislike: "ไม่ถูกใจ",
  moreOptions: "ตัวเลือกเพิ่มเติม",
  conversations: "บทสนทนา",
  newChat: "สร้างแชทใหม่",
  noConversations: "ยังไม่มีบทสนทนา",
  reply: "ตอบกลับ",
  regenerate: "สร้างใหม่",
  delete: "ลบ",
  placeholderAsk: "ถามคำถามเพิ่มเติม...",
  voiceInput: "ป้อนเสียง",
  sendMessage: "ส่งข้อความ",
  renameConversation: "เปลี่ยนชื่อบทสนทนา",
  generateBetterTitle: "สร้างชื่อที่ดีกว่า",
  deleteConversation: "ลบบทสนทนา",
  tryAgain: "ลองใหม่",
  addDetails: "เพิ่มรายละเอียด",
  moreConcise: "ย่อให้กระชับ",
  searchTheWeb: "ค้นหาบนเว็บ",
  newChatUI: "เริ่มแชทใหม่",
  online: "ออนไลน์",
  theme: "ธีม",
  preferences: "การตั้งค่า",
  soundEffects: "เสียงเอฟเฟกต์",
  notifications: "การแจ้งเตือน",
  light: "สว่าง",
  dark: "มืด",
  system: "ตามระบบ",
  searchChats: "ค้นหาการแชท",
  pageNotFound: "ไม่พบหน้า",
  pageNotFoundLead: "หน้าเว็บที่คุณค้นหาไม่มีอยู่หรืออาจถูกย้ายแล้ว",
  goHome: "กลับหน้าแรก",
  cmdPlaceholder: "ค้นหาหรือถามคำถามใน {app}...",
  quickActions: "ทางลัด",
  qaNewChatWithBaoBao: "เริ่มแชทกับ BaoBao",
  qaFindInvoice: "ค้นหา 'invoice' ในแชท",
  qaUploadPdf: "อัปโหลด PDF",
  whosChatting: "อยากคุยกับใคร",
  cancel: "ยกเลิก",
  disclaimer: "AXONS AI อาจแสดงข้อมูลที่ไม่ถูกต้องและไม่ได้เป็นตัวแทนมุมมองของผู้อื่น โปรดตรวจสอบข้อมูลอีกครั้งก่อนนำไปใช้",
};

const LOCALES: Record<Locale, Messages> = { en, th };

type I18nContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: keyof typeof en, vars?: Record<string, string>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  useEffect(() => {
    try { const saved = localStorage.getItem('axio.locale') as Locale | null; if (saved) setLocaleState(saved); } catch {}
  }, []);
  const setLocale = (l: Locale) => { setLocaleState(l); try { localStorage.setItem('axio.locale', l); } catch {} };

  const t = useMemo(() => {
    return (key: keyof typeof en, vars?: Record<string, string>) => {
      const dict = LOCALES[locale] || en;
      let text = (dict as any)[key] || (en as any)[key] || String(key);
      if (vars) { Object.entries(vars).forEach(([k,v]) => { text = text.replace(`{${k}}`, v); }); }
      return text;
    };
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}


