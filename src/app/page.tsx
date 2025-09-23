"use client";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
// Custom auth - no longer using NextAuth
import { Button } from "@/components/ui/button";
import { Message } from "@/components/chat/Message";
import { MessageActions } from "@/components/chat/MessageActions";
import { ContextMenu } from "@/components/chat/ContextMenu";
import { GoogleDrivePicker, useGoogleDriveAuth } from "@/components/GoogleDrivePicker";
import { Plus, Search, Mic, User, Settings, Menu, ChevronDown, LogOut, Bot } from "lucide-react";
import { CustomAuthWrapper } from "@/components/auth/CustomAuthWrapper";
import { CustomAuthModal } from "@/components/auth/CustomAuthModal";
import { AssistantWelcome } from "@/components/chat/AssistantWelcome";
import { useTheme } from "@/components/ClientThemeProvider";

type ChatMessage = { 
  id: string; 
  role: "user" | "assistant"; 
  content: string; 
  feedback?: "like" | "dislike" | null;
  parentId?: string;
  thoughtProcess?: {
    thoughts: string[];
    duration?: number;
    isComplete?: boolean;
  };
};
type Conversation = { id: string; title: string; messages: ChatMessage[]; createdAt: string; updatedAt: string; assistantId?: string };

interface AttachmentFile {
  id?: string;
  name: string;
  type?: string;
  size?: number;
  url?: string;
  iconUrl?: string;
  lastEdited?: string;
  serviceId?: string;
  isGoogleDrive?: boolean;
  file?: File;
  // client-side upload status
  progress?: number; // 0 - 100
  uploaded?: boolean;
  serverName?: string;
  serverSize?: number;
  serverUrl?: string;
  error?: string;
}

export default function Home() {
  const [user, setUser] = useState<{id: string; name: string; email: string; image?: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { theme, setTheme } = useTheme();

  // Check authentication status
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      setUser(null);
      // Refresh the page or redirect to login
      window.location.reload();
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    // Clear the input and send the suggestion immediately
    setInput('');
    await handleSend(undefined, suggestion);
  };

  // Generate thought process based on assistant and user input
  const generateThoughtProcess = (assistantId: string, userInput: string) => {
    const assistantThoughts = {
      'asst_sS0Sa5rqQFrrwnwkJ9mULGp0': { // BaoBao
        thoughts: [
          "Analyzing the user's request for UX writing assistance...",
          "Considering the target audience and user group context...",
          "Evaluating clarity, tone, and appropriateness of language...",
          "Preparing UX-focused writing recommendations..."
        ]
      },
      'asst_CO7qtWO5QTfgV0Gyv77XQY8q': { // DeeDee
        thoughts: [
          "Understanding the UX research context and objectives...",
          "Identifying key research questions and methodologies...",
          "Planning user research approach and data collection...",
          "Preparing actionable insights and recommendations..."
        ]
      },
      'asst_Pi6FrBRHRpvhwSOIryJvDo3T': { // PungPung
        thoughts: [
          "Analyzing the data and feedback provided...",
          "Identifying patterns and trends in the information...",
          "Processing quantitative and qualitative insights...",
          "Preparing comprehensive analysis and summaries..."
        ]
      },
      'asst_4nCaYlt7AA5Ro4pseDCTbKHO': { // FlowFlow
        thoughts: [
          "Evaluating the design requirements and constraints...",
          "Considering user experience principles and best practices...",
          "Planning UI/UX design solutions and improvements...",
          "Preparing design recommendations and mockups..."
        ]
      }
    };

    const defaultThoughts = [
      "Processing the user's request...",
      "Analyzing the context and requirements...",
      "Preparing a comprehensive response...",
      "Finalizing recommendations and insights..."
    ];

    const thoughts = assistantThoughts[assistantId as keyof typeof assistantThoughts]?.thoughts || defaultThoughts;
    const duration = Math.floor(Math.random() * 15) + 5; // Random duration between 5-20 seconds

    return {
      thoughts,
      duration,
      isComplete: false
    };
  };
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [responseId, setResponseId] = useState<string | undefined>(undefined);
  const [assistantId, setAssistantId] = useState<string | undefined>(process.env.NEXT_PUBLIC_ASSISTANT_ID as string | undefined);
  const babaoAvatar = process.env.NEXT_PUBLIC_AVATAR_BABAO ?? '/avatars/BaoBao.jpeg';
  const deedeeAvatar = process.env.NEXT_PUBLIC_AVATAR_DEEDEE ?? '/avatars/DeeDee.png';
  const pungpungAvatar = process.env.NEXT_PUBLIC_AVATAR_PUNGPUNG ?? '/avatars/PungPung.png';
  const flowflowAvatar = process.env.NEXT_PUBLIC_AVATAR_FLOWFLOW ?? '/avatars/FlowFlow.jpeg';
  const assistantCatalog = [
    { id: 'asst_sS0Sa5rqQFrrwnwkJ9mULGp0', code: 'asst_sS0Sa5rqQFrrwnwkJ9mULGp0', name: 'Babao', emoji: '🍼', avatar: babaoAvatar },
    { id: 'asst_CO7qtWO5QTfgV0Gyv77XQY8q', code: 'asst_CO7qtWO5QTfgV0Gyv77XQY8q', name: 'DeeDee', emoji: '🦊', avatar: deedeeAvatar },
    { id: 'asst_Pi6FrBRHRpvhwSOIryJvDo3T', code: 'asst_Pi6FrBRHRpvhwSOIryJvDo3T', name: 'PungPung', emoji: '🦉', avatar: pungpungAvatar },
    { id: 'asst_4nCaYlt7AA5Ro4pseDCTbKHO', code: 'asst_4nCaYlt7AA5Ro4pseDCTbKHO', name: 'FlowFlow', emoji: '🐙', avatar: flowflowAvatar },
  ];
  const assistantById = (id?: string) => {
    const result = assistantCatalog.find(a => a.code === id);
    return result;
  };
  const [useAssistant, setUseAssistant] = useState<boolean>(!!assistantId);
  const [model, setModel] = useState<string>("gpt-5");
  const [instructions] = useState<string>("");
  const [currentConvId, setCurrentConvId] = useState<string | undefined>(undefined);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [suggestions, setSuggestions] = useState<{ title: string; description: string; action: string }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const uploadXhrsRef = useRef<Map<string, XMLHttpRequest>>(new Map());

  const uploadAttachment = useCallback((item: AttachmentFile) => {
    if (!item || !item.file || !item.id) return;
    const idKey = item.id;
    setAttachments(prev => prev.map(a => a.id===idKey ? { ...a, progress: 0, uploaded: false, error: undefined } : a));
    const xhr = new XMLHttpRequest();
    // Upload to OpenAI Files via our proxy endpoint
    xhr.open('POST', '/api/openai/files');
    xhr.responseType = 'json';
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        setAttachments(prev => prev.map(a => a.id===idKey ? { ...a, progress: pct } : a));
      }
    };
    xhr.onerror = () => {
      setAttachments(prev => prev.map(a => a.id===idKey ? { ...a, error: 'Upload failed', uploaded: false } : a));
      uploadXhrsRef.current.delete(idKey);
    };
    xhr.onload = () => {
      const ok = xhr.status>=200 && xhr.status<300;
      const data = xhr.response || {};
      setAttachments(prev => prev.map(a => a.id===idKey ? { ...a, uploaded: ok, error: ok? undefined : `HTTP ${xhr.status}` , name: data.name || a.name, size: data.size || a.size, type: a.type, ...(data.fileId ? { fileId: data.fileId } : {}) } : a));
      uploadXhrsRef.current.delete(idKey);
    };
    const formData = new FormData();
    formData.append('file', item.file as File);
    uploadXhrsRef.current.set(idKey, xhr);
    xhr.send(formData);
  }, []);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const previousMessageCountRef = useRef<number>(0);
  const [showScrollToBottom, setShowScrollToBottom] = useState<boolean>(false);
  const [showAssistantPicker, setShowAssistantPicker] = useState<boolean>(false);
  const [recordingFormat, setRecordingFormat] = useState<string>('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: string } | null>(null);
  const [messageFeedbacks, setMessageFeedbacks] = useState<Record<string, "like" | "dislike" | null>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showGoogleDrivePicker, setShowGoogleDrivePicker] = useState(false);
  const [currentConversationTitle, setCurrentConversationTitle] = useState<string>('New Chat');
  const [showConversationMenu, setShowConversationMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [assistantOptionsMenu, setAssistantOptionsMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [attachmentPreviewIndex, setAttachmentPreviewIndex] = useState<number | null>(null);
  const [prefSound, setPrefSound] = useState<boolean>(true);
  const [prefNotify, setPrefNotify] = useState<boolean>(true);
  
  const [renamingConvId, setRenamingConvId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const { authenticate } = useGoogleDriveAuth();
  const [startingConversation, setStartingConversation] = useState(false);
  const [holdOnHome, setHoldOnHome] = useState(false);

  // Mobile keyboard-safe viewport offset using VisualViewport API
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') setShowSearch(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Preload all conversations (across assistants) for universal search
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/conversations');
        if (res.ok) {
          const data = await res.json();
          setAllConversations(Array.isArray(data) ? data : (data?.items || []));
        }
      } catch {}
    })();
  }, []);

  const runSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    // Client-side quick search (priority: message content, then conversations, then assistants)
    const msgHits = messages
      .filter(m => (m.content||'').toLowerCase().includes(q.toLowerCase()))
      .slice(0, 20)
      .map(m => ({ type: 'message', id: m.id, title: m.content.substring(0, 120) }));
    const assistantHits = assistantCatalog
      .filter(a => a.name.toLowerCase().includes(q.toLowerCase()))
      .map(a => ({ type: 'assistant', id: a.id, title: a.name, icon: a.avatar }));
    const convoHits = (allConversations.length ? allConversations : conversations)
      .filter(c => (c.title||'').toLowerCase().includes(q.toLowerCase()))
      .map(c => ({ type: 'conversation', id: c.id, title: c.title }));
    // Web search action (opens in new tab)
    const webHit = { type: 'web', id: q, title: `Search the web for “${q}”` } as any;
    setSearchResults([...msgHits, ...convoHits, ...assistantHits, webHit]);
  }, [assistantCatalog, conversations, messages, allConversations]);
  useEffect(() => {
    if (typeof window === 'undefined' || !('visualViewport' in window)) return;
    const vv = (window as any).visualViewport as VisualViewport | undefined;
    if (!vv) return;
    const handler = () => {
      const offset = Math.max(0, (window.innerHeight - vv.height - (vv.offsetTop || 0)));
      document.documentElement.style.setProperty('--kb-offset', `${Math.round(offset)}px`);
    };
    handler();
    vv.addEventListener('resize', handler);
    vv.addEventListener('scroll', handler);
    return () => {
      vv.removeEventListener('resize', handler);
      vv.removeEventListener('scroll', handler);
      document.documentElement.style.removeProperty('--kb-offset');
    };
  }, []);

  // Lightweight UI sound for micro-interactions (hover/click)
  const audioContextRef = useRef<AudioContext | null>(null);
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);
  const playUiSound = useCallback((type: 'hover' | 'select' | 'send' | 'done' = 'select') => {
    try {
      if (!prefSound) return;
      const Ctx: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      audioContextRef.current ??= new Ctx();
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      const isHover = type === 'hover';
      let duration = isHover ? 0.05 : 0.08;
      let startFreq = isHover ? 420 : 560;
      let endFreq = isHover ? 480 : 660;
      if (type === 'send') { duration = 0.12; startFreq = 660; endFreq = 420; osc.type = 'triangle'; }
      else if (type === 'done') { duration = 0.09; startFreq = 500; endFreq = 760; osc.type = 'sine'; }
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.linearRampToValueAtTime(endFreq, now + duration);
      gain.gain.setValueAtTime(isHover ? 0.02 : 0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch {}
  }, []);

  // Desktop browser notifications for assistant replies
  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !("Notification" in window)) return;
    if (Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch {}
    }
  }, []);

  const notifyAssistantReply = useCallback((assistantName: string | undefined, text: string) => {
    if (typeof window === 'undefined' || !("Notification" in window)) return;
    if (!prefNotify) return;
    // Notify only when tab is hidden
    if (document.visibilityState !== 'hidden') return;
    if (Notification.permission !== 'granted') return;
    const title = assistantName ? `${assistantName} replied` : 'Assistant replied';
    const body = text.slice(0, 160);
    try {
      const reg = swRegRef.current;
      if (reg && 'showNotification' in reg) {
        reg.showNotification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'assistant-reply',
          requireInteraction: true,
          silent: false
        });
        return;
      }
    } catch {}
    try {
      const n = new Notification(title, { body, icon: '/favicon.ico', tag: 'assistant-reply' });
      n.onclick = () => { window.focus(); n.close(); };
    } catch {}
  }, []);

  // Register a lightweight service worker for robust notifications (desktop/macOS/Windows)
  useEffect(() => {
    if (!prefNotify) return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw-notify.js').then(async (reg) => {
      swRegRef.current = reg;
      try { await navigator.serviceWorker.ready; } catch {}
    }).catch(() => {});
  }, [prefNotify]);

  // Load conversations and suggestions when user is authenticated
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Only load if user is authenticated
    if (user?.id) {
      loadConversations(assistantId);
      loadSuggestions();
    }
  }, [user?.id, assistantId]);

  // Close plus menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showPlusMenu && !(event.target as Element).closest('.plus-menu-container')) {
        setShowPlusMenu(false);
      }
      if (showConversationMenu && !(event.target as Element).closest('.conversation-menu-container')) {
        setShowConversationMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPlusMenu, showConversationMenu]);

  // Load assistantId from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("assistantId");
      if (saved) {
        setAssistantId(saved);
        setUseAssistant(true);
      }
    } catch {}
  }, []);

  // Persist assistantId to localStorage
  useEffect(() => {
    try {
      if (assistantId) localStorage.setItem("assistantId", assistantId);
      else localStorage.removeItem("assistantId");
    } catch {}
  }, [assistantId]);

  // Load sound/notification prefs
  useEffect(() => {
    try {
      const ps = localStorage.getItem('pref-sound');
      const pn = localStorage.getItem('pref-notify');
      if (ps !== null) setPrefSound(ps === '1' || ps === 'true');
      if (pn !== null) setPrefNotify(pn === '1' || pn === 'true');
    } catch {}
  }, []);

  useEffect(() => { try { localStorage.setItem('pref-sound', prefSound ? '1' : '0'); } catch {} }, [prefSound]);
  useEffect(() => { try { localStorage.setItem('pref-notify', prefNotify ? '1' : '0'); } catch {} }, [prefNotify]);

  // Toggle scroll-to-bottom using IntersectionObserver on the bottom anchor
  useEffect(() => {
    const rootEl = chatScrollRef.current;
    const targetEl = bottomRef.current;
    if (!rootEl || !targetEl) return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setShowScrollToBottom(!entry.isIntersecting);
      },
      // Use a more forgiving threshold so the button hides when we're near the bottom
      { root: rootEl, threshold: 0.01, rootMargin: "0px" }
    );
    io.observe(targetEl);
    return () => io.disconnect();
  }, [messages.length, chatScrollRef, bottomRef]);

  // Fallback: also hide button when user reaches bottom via quick scroll (additional guard)
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const check = () => {
      const tolerance = 24;
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - tolerance;
      setShowScrollToBottom(!nearBottom);
    };
    check();
    el.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      el.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [chatScrollRef]);

  

  // Smoothly scroll when we transition from home to conversation
  useEffect(() => {
    const previous = previousMessageCountRef.current;
    if (previous === 0 && messages.length > 0) {
      const el = chatScrollRef.current;
      if (el) {
        requestAnimationFrame(() => {
          el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        });
      } else {
        requestAnimationFrame(() => {
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        });
      }
    }
    previousMessageCountRef.current = messages.length;
  }, [messages.length]);

  const loadConversations = async (specificAssistantId?: string) => {
    try {
      const url = new URL("/api/conversations", window.location.origin);
      const targetAssistantId = specificAssistantId || assistantId;
      if (targetAssistantId) url.searchParams.set('assistantId', targetAssistantId);
      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
        return data as Conversation[];
      } else if (response.status === 401) {
        // User not authenticated, silently return empty array
        return [] as Conversation[];
      } else {
        console.warn('Failed to load conversations:', response.status, response.statusText);
        return [] as Conversation[];
      }
    } catch (error) {
      console.warn('Error loading conversations:', error);
      return [] as Conversation[];
    }
  };

  const loadSuggestions = async () => {
    try {
      const response = await fetch("/api/chat/suggestions");
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } else if (response.status === 401) {
        // User not authenticated, silently return
        return;
      } else {
        console.warn('Failed to load suggestions:', response.status, response.statusText);
      }
    } catch (error) {
      console.warn('Error loading suggestions:', error);
    }
  };

  const loadConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (response.ok) {
        const conversation = await response.json();
        // Ensure messages are properly formatted and sorted
        const formattedMessages = conversation.messages
          .sort((a: { createdAt: string }, b: { createdAt: string }) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          .map((msg: { id: string; role: 'user' | 'assistant' | string; content: string; feedback?: 'like' | 'dislike' | null | string; parentId?: string }): ChatMessage => ({
            id: msg.id,
            role: (msg.role === 'user' || msg.role === 'assistant') ? msg.role : 'assistant',
            content: msg.content,
            feedback: (msg.feedback === 'like' || msg.feedback === 'dislike' || msg.feedback === null) ? msg.feedback : null,
            parentId: msg.parentId,
          }));
        setMessages(formattedMessages);
        
        // Update current conversation title
        setCurrentConversationTitle(conversation.title);
        
        // Load feedback states for all messages
        const feedbackStates: Record<string, "like" | "dislike" | null> = {};
        formattedMessages.forEach((msg: ChatMessage) => {
          if (msg.feedback) {
            feedbackStates[msg.id] = msg.feedback;
          }
        });
        setMessageFeedbacks(feedbackStates);
        
        setCurrentConvId(conversationId);
        setResponseId(undefined);
        // Refresh conversations list to update selection
        loadConversations(assistantId);
      }
    } catch (error) {
      // Silently fail loading conversation
    }
  };

  const generateConversationTitle = async (conversationId: string) => {
    try {
      const response = await fetch("/api/chat/generate-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });
      
      if (response.ok) {
        await response.json();
        // Refresh conversations to show the new title
        loadConversations(assistantId);
      }
    } catch (error) {
      // Silently fail generating title
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Check for supported MIME types
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      }
      
      
      const recorder = new MediaRecorder(stream, { mimeType });
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      // Create a file with the appropriate extension based on MIME type
      const extension = mimeType.includes('webm') ? 'webm' : 
                       mimeType.includes('mp4') ? 'mp4' : 
                       mimeType.includes('ogg') ? 'ogg' : 'wav';

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: mimeType });
        const audioFile = new File([audioBlob], `recording.${extension}`, { type: mimeType });
        setAttachments(prev => [...prev, audioFile]);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingFormat(extension);
    } catch (error) {
      alert("Microphone access denied or not available. Please check your browser permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const handleAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const attachmentFiles: AttachmentFile[] = Array.from(files).map(file => ({
        id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        file: file,
        progress: 0,
        uploaded: false
      }));
      setAttachments(prev => {
        const next = [...prev, ...attachmentFiles];
        return next;
      });
      // Start uploads for each new item using their ids
      requestAnimationFrame(() => {
        attachmentFiles.forEach((it) => uploadAttachment(it));
      });
      // Close plus menu after selection to avoid interfering with system picker
      setShowPlusMenu(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };


  const handleGoogleDriveSelect = async () => {
    try {
      const accessToken = await authenticate();
      if (accessToken) {
        setShowGoogleDrivePicker(true);
        setShowPlusMenu(false);
      } else {
        alert('ไม่สามารถเข้าถึง Google Drive ได้ กรุณาลองใหม่');
      }
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ Google Drive');
    }
  };

  const handleGoogleDriveFiles = async (files: { name: string; id: string; mimeType: string; webViewLink?: string }[]) => {
    
    try {
      // Fetch each file bytes from server then attach as File
      const fetched: AttachmentFile[] = [];
      for (const f of files) {
        try {
          const resp = await fetch('/api/drive/fetch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileId: f.id })
          });
          if (resp.ok) {
            const blob = await resp.blob();
            const serverName = decodeURIComponent(resp.headers.get('X-File-Name') || f.name);
            const mime = resp.headers.get('Content-Type') || f.mimeType || 'application/octet-stream';
            const sizeHeader = resp.headers.get('X-File-Size');
            const fileObj = new File([blob], serverName, { type: mime });
            fetched.push({
              id: f.id,
              name: serverName,
              type: mime,
              size: sizeHeader ? Number(sizeHeader) : blob.size,
        isGoogleDrive: true,
              url: resp.headers.get('X-File-WebViewLink') || f.webViewLink || '',
              file: fileObj,
            });
          }
        } catch (e) {
          // Silently skip failed file
        }
      }

      if (fetched.length > 0) setAttachments(prev => [...prev, ...fetched]);
      setShowGoogleDrivePicker(false);
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการประมวลผลไฟล์จาก Google Drive');
    }
  };

  // Context menu handlers
  const handleRightClick = (event: React.MouseEvent, messageId: string) => {
    event.preventDefault();
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    const x = event.clientX + scrollX;
    const y = event.clientY + scrollY;
    setContextMenu({ x, y, messageId });
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  // Assistant options (three-dots) menu
  const handleAssistantOptions = (event: React.MouseEvent, messageId: string) => {
    event.preventDefault();
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    const x = event.clientX + scrollX;
    const y = event.clientY + scrollY;
    setAssistantOptionsMenu({ id: messageId, x, y });
  };

  const closeAssistantOptions = () => setAssistantOptionsMenu(null);

  const prefillFromMessage = (messageId: string, prefix: string) => {
    const m = messages.find(mm => mm.id === messageId);
    const snippet = m ? (m.content.length > 280 ? m.content.slice(0, 280) + '…' : m.content) : '';
    setInput(`${prefix}\n\n"""${snippet}"""`);
  };

  const handleOptionsTryAgain = (messageId: string) => {
    handleRegenerate(messageId);
    closeAssistantOptions();
  };

  const handleOptionsAddDetails = (messageId: string) => {
    prefillFromMessage(messageId, 'Add more details to this:');
    closeAssistantOptions();
  };

  const handleOptionsMoreConcise = (messageId: string) => {
    prefillFromMessage(messageId, 'Make this more concise:');
    closeAssistantOptions();
  };

  const handleOptionsSearchWeb = (messageId: string) => {
    prefillFromMessage(messageId, 'Search the web about:');
    closeAssistantOptions();
  };

  const handleOptionsSwitchModel = (newModel: string) => {
    setModel(newModel);
    try { localStorage.setItem('chat-model', newModel); } catch {}
    closeAssistantOptions();
  };

  // Heuristic thinking bullets generator
  const generateThinkingBullets = (query: string): string[] => {
    const q = query.toLowerCase();
    if (/buy|purchase|price|order|regret/.test(q)) {
      return [
        'Structuring a decision framework',
        'Accounting for image or product details',
        'Analyzing pros/cons & potential regret triggers',
        'Providing a provisional estimate or verdict',
        'Structuring comparable options'
      ];
    }
    if (/plan|project|strategy|design/.test(q)) {
      return [
        'Clarifying objectives & constraints',
        'Outlining a phased approach',
        'Selecting key tools & resources',
        'Identifying risks & mitigations',
        'Drafting summary & next actions'
      ];
    }
    return [
      'Understanding your request & context',
      'Gathering relevant knowledge',
      'Structuring the response outline',
      'Drafting concise, scannable content',
      'Quality check and deliver'
    ];
  };

  // Feedback handlers
  const handleFeedback = async (messageId: string, feedback: "like" | "dislike" | null) => {
    try {
      
      // Check if messageId is valid
      if (!messageId || messageId === 'undefined' || messageId.startsWith('message-') || messageId.length < 10) {
        return;
      }
      
      // Check if message exists in current messages
      const messageExists = messages.some(m => m.id === messageId);
      if (!messageExists) {
        return;
      }
      
      // Check if message is from database (has been saved)
      const message = messages.find(m => m.id === messageId);
      if (!message || message.id.startsWith('temp-') || message.id.length < 20) {
        return;
      }
      
      // Verify message exists in database by checking if it has a valid conversationId
      if (!currentConvId) {
        return;
      }
      
      // Double-check: verify the message exists in the database
      try {
        const verifyResponse = await fetch(`/api/conversations/${currentConvId}`);
        if (verifyResponse.ok) {
          const conversation = await verifyResponse.json();
          const messageExistsInDb = conversation.messages.some((m: { id: string }) => m.id === messageId);
          if (!messageExistsInDb) {
            return;
          }
        }
      } catch (error) {
        return;
      }
      
      // Check if messageId looks like a database ID (not a temporary UUID)
      if (messageId.length < 20) {
        return;
      }
      
      // Check if this is a valid database ID format (UUID or CUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const cuidRegex = /^c[a-z0-9]{24}$/i; // Prisma CUID format
      
      if (!uuidRegex.test(messageId) && !cuidRegex.test(messageId)) {
        return;
      }
      
      // Update UI immediately for better UX
      setMessageFeedbacks(prev => ({
        ...prev,
        [messageId]: feedback
      }));

      const response = await fetch(`/api/messages/${messageId}/feedback`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update the message in the messages array as well
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, feedback }
            : msg
        ));
      } else {
        // Revert the UI change if API call failed
        setMessageFeedbacks(prev => ({
          ...prev,
          [messageId]: prev[messageId] // Revert to previous state
        }));
        
        const errorText = await response.text();
        
        // Show user-friendly error message
        alert(`ไม่สามารถอัปเดต feedback ได้: ${response.statusText}`);
      }
    } catch (error) {
      // Revert the UI change if API call failed
      setMessageFeedbacks(prev => ({
        ...prev,
        [messageId]: prev[messageId] // Revert to previous state
      }));
    }
  };

  // Reply handler
  const handleReply = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      setReplyingTo(messageId);
      setInput(""); // Clear input first
    }
    setContextMenu(null);
  };

  // Regenerate handler
  const handleRegenerate = async (messageId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/messages/${messageId}/regenerate`, {
        method: "POST",
      });

      if (response.ok && response.body) {
        // Stream the new response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let newContent = "";

        // Update the message in real-time
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, content: "" } // Clear content first
            : msg
        ));

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            newContent += chunk;
            
            // Update the message content in real-time
            setMessages(prev => prev.map(msg => 
              msg.id === messageId 
                ? { ...msg, content: newContent }
                : msg
            ));
          }
        } finally {
          reader.releaseLock();
        }

        // Save the final message to database
        if (currentConvId) {
          await fetch("/api/chat/save-message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              role: "assistant",
              content: newContent,
              conversationId: currentConvId,
              shouldRename: false,
            }),
          });
        }
      }
    } catch (error) {
      // Silently fail regenerating message
    } finally {
      setLoading(false);
    }
    setContextMenu(null);
  };

  // Delete handler
  const handleDeleteMessage = async (messageId: string) => {
    if (confirm("คุณแน่ใจหรือไม่ที่จะลบข้อความนี้?")) {
      try {
        const response = await fetch(`/api/messages/${messageId}/delete`, {
          method: "DELETE",
        });

        if (response.ok) {
          // Remove message from local state
          setMessages(prev => prev.filter(m => m.id !== messageId));
          // Reload conversation to sync with database
          if (currentConvId) {
            loadConversation(currentConvId);
          }
        }
      } catch (error) {
        // Silently fail deleting message
      }
    }
    setContextMenu(null);
  };

  // Copy handler
  const handleCopy = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      try {
        await navigator.clipboard.writeText(message.content);
        // Text copied successfully
      } catch (error) {
        // Silently fail copying text
      }
    }
    setContextMenu(null);
  };

  const newConversation = async () => {
    setMessages([]);
    setCurrentConvId(undefined);
    setResponseId(undefined);
    
    const newTitle = `New Chat ${new Date().toLocaleTimeString()}`;
    setCurrentConversationTitle(newTitle);
    
    // Create a new conversation in the database immediately
    try {
      let chosenAssistant = assistantId;
      if (!chosenAssistant) {
        const name = prompt('Choose assistant: Babao, DeeDee, PungPung, FlowFlow', 'Babao');
        const map: Record<string, string> = {
          Babao: 'asst_sS0Sa5rqQFrrwnwkJ9mULGp0',
          DeeDee: 'asst_CO7qtWO5QTfgV0Gyv77XQY8q',
          PungPung: 'asst_Pi6FrBRHRpvhwSOIryJvDo3T',
          FlowFlow: 'asst_4nCaYlt7AA5Ro4pseDCTbKHO',
        };
        chosenAssistant = map[name || 'Babao'] || map.Babao;
        setAssistantId(chosenAssistant);
      }

      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, assistantId: chosenAssistant }),
      });
      
      if (response.ok) {
        const newConv = await response.json();
        setCurrentConvId(newConv.id);
        // Refresh conversations list to show the new conversation
        loadConversations(chosenAssistant);
      }
    } catch (error) {
      // Silently fail creating new conversation
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setConversations(prev => prev.filter(c => c.id !== conversationId));
        if (currentConvId === conversationId) {
          // Clear the current chat; do not auto-create a new conversation
          setCurrentConvId(undefined);
          setMessages([]);
          setCurrentConversationTitle('New Chat');
        }
      }
    } catch (error) {
      // Silently fail deleting conversation
    }
  };

  async function handleSend(
    e?: React.FormEvent,
    overrideText?: string,
    overrideConversationId?: string,
    overrideAssistantId?: string
  ) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const wasEmpty = messages.length === 0;
    const baseText = (overrideText ?? input).trim();
    if (!baseText || loading) return;
    requestNotificationPermission();
    playUiSound('send');
    if (wasEmpty) {
      setHoldOnHome(true);
      setStartingConversation(true);
      // After the exit animation, release the hold so the bottom chatbar appears
      setTimeout(() => {
        setStartingConversation(false);
        setHoldOnHome(false);
      }, 400);
    }
    
    // Auto web-search heuristic for time-sensitive/unknown queries
    let webSummary = '';
    try {
      const trigger = /(ราคาทอง|ทองคำ|ราคาทองคำ|weather|อากาศ|พยากรณ์|today|ล่าสุด|วันนี้|ราคา|update|breaking|news)/i.test(baseText);
      if (trigger) {
        const resp = await fetch(`/api/search/web?q=${encodeURIComponent(baseText.slice(0, 140))}`);
        if (resp.ok) {
          const s = await resp.json();
          if (s.abstract || s.heading || s.related?.length) {
            webSummary = `\n\n[Web summary]\nTitle: ${s.heading || ''}\nSummary: ${s.abstract || ''}\nRelated: ${(s.related||[]).join(' | ')}\nSource: ${s.sourceUrl || ''}`;
          }
        }
      }
    } catch {}

    // Process attachments first
    let attachmentInfo = "";
    if (attachments.length > 0) {
      try {
        const uploadPromises = attachments.map(async (file, idx) => {
          // Check if it's a Google Drive file or manual upload
          if (file.isGoogleDrive && !file.file) {
            // Google Drive file - no need to upload, just add info
            return `📎 ไฟล์จาก Google Drive: ${file.name} (${((file.size || 0) / 1024).toFixed(1)} KB) - ${file.url}`;
          } else if (file.file) {
            // Manual upload file - upload to server
            await new Promise<void>((resolve) => {
              const xhr = new XMLHttpRequest();
              xhr.open('POST', '/api/upload');
              xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                  const pct = Math.round((e.loaded / e.total) * 100);
                  setAttachments(prev => prev.map((a, i) => i===idx ? { ...a, progress: pct } : a));
                }
              };
              xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  try {
                    const response = JSON.parse(xhr.responseText);
                    const fileId = response?.file?.fileId;
                    console.log('File upload success, fileId:', fileId);
                    setAttachments(prev => prev.map((a, i) => 
                      i === idx ? { 
                        ...a, 
                        uploaded: true, 
                        fileId: fileId // Store the OpenAI file ID!
                      } : a
                    ));
                  } catch (e) {
                    console.error('Error parsing upload response:', e);
                    setAttachments(prev => prev.map((a, i) => 
                      i === idx ? { ...a, uploaded: true } : a
                    ));
                  }
                } else {
                  setAttachments(prev => prev.map((a, i) => 
                    i === idx ? { ...a, error: `HTTP ${xhr.status}` } : a
                  ));
                }
                resolve();
              };
              xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                  uploadXhrsRef.current.delete(attachments[idx]?.id || '');
                }
              };
              const formData = new FormData();
              formData.append('file', file.file as File);
              uploadXhrsRef.current.set(attachments[idx]?.id || '', xhr);
              xhr.send(formData);
            });
            // Completed; we already updated state in onload with fileId
            return `📎 ไฟล์แนบ: ${file.name} (${((file.size || 0) / 1024).toFixed(1)} KB)`;
          } else {
            // Fallback for other file types
            return `📎 ไฟล์แนบ: ${file.name} (${((file.size || 0) / 1024).toFixed(1)} KB)`;
          }
        });
        
        const attachmentTexts = await Promise.all(uploadPromises);
        attachmentInfo = "\n\n" + attachmentTexts.join("\n");
      } catch (error) {
        attachmentInfo = "\n\n📎 ไฟล์แนบ: เกิดข้อผิดพลาดในการประมวลผล";
      }
    }
    
    // Add reply context if replying to a message
    let replyContext = "";
    if (replyingTo) {
      const replyMessage = messages.find(m => m.id === replyingTo);
      if (replyMessage) {
        replyContext = `\n\nตอบกลับ: ${replyMessage.content}`;
        setReplyingTo(null); // Clear reply after sending
      }
    }

    const guidance = webSummary
      ? `\n\n[Guidance]\nA web summary was fetched. Use only this summary to answer the user's question. Do not say you cannot access the internet. Respond concisely and include the Source URL if helpful.`
      : '';
    const fullContent = (webSummary ? `${baseText}${guidance}\n${webSummary}` : baseText) + attachmentInfo + replyContext;
    const userMessage: ChatMessage = { 
      id: crypto.randomUUID(), 
      role: "user", 
      content: fullContent,
      parentId: replyingTo || undefined
    };
    setMessages((prev) => [...prev, userMessage]);
    if (!overrideText) setInput("");
    setAttachments([]); // Clear attachments after sending
    setLoading(true);

    // Ensure a conversation exists before saving/sending
    let targetConversationId = overrideConversationId || currentConvId;
    if (!targetConversationId) {
      try {
        const provisionalTitle = input.slice(0, 60) || 'New Chat';
        const createResp = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: provisionalTitle, assistantId }),
        });
        if (createResp.ok) {
          const created = await createResp.json();
          targetConversationId = created.id;
          setCurrentConvId(created.id);
          // Refresh sidebar for the selected assistant
          await loadConversations(assistantId);
          // Smoothly scroll to chat area instead of navigating away
          requestAnimationFrame(() => {
            document.getElementById('chat-bottom-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'end' });
          });
        }
      } catch (err) {
        // Silently fail creating conversation before send
      }
    }

    // Save user message immediately to database
    if (targetConversationId) {
      try {
        // Check if this is the first user message in the conversation
        const isFirstUserMessage = messages.filter(m => m.role === "user").length === 0;
        
        const userSaveResponse = await fetch("/api/chat/save-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "user",
            content: fullContent,
            conversationId: targetConversationId,
            shouldRename: isFirstUserMessage, // Rename conversation if this is the first user message
          }),
        });
        
        if (userSaveResponse.ok) {
          const savedUserMessage = await userSaveResponse.json();
          // Update the user message ID in the UI with the actual database ID
          setMessages(prev => prev.map(msg => 
            msg.id === userMessage.id 
              ? { ...msg, id: savedUserMessage.id }
              : msg
          ));
          
          // Also update the messageFeedbacks state with the new ID
          if (savedUserMessage.id !== userMessage.id) {
            setMessageFeedbacks(prev => {
              const newState = { ...prev };
              if (prev[userMessage.id] !== undefined) {
                newState[savedUserMessage.id] = prev[userMessage.id];
                delete newState[userMessage.id];
              }
              return newState;
            });
          }
        }
        
        // If this is the first user message, generate a better title
        if (isFirstUserMessage) {
          setTimeout(() => {
            if (targetConversationId) generateConversationTitle(targetConversationId);
          }, 1000); // Wait a bit for the message to be saved
        }
        
        // Reload the current conversation to get the correct message IDs
        setTimeout(() => {
          if (targetConversationId) loadConversation(targetConversationId);
        }, 2000); // Wait even longer for database to be updated
        } catch (error) {
        // Silently fail saving user message
      }
    }

    // Choose assistant id with strong preference for explicit override,
    // then conversation's assigned assistant, then current state.
    const convoAssistantId = targetConversationId
      ? conversations.find(c => c.id === targetConversationId)?.assistantId
      : undefined;
    const chosenAssistantId = overrideAssistantId || convoAssistantId || assistantId;
    const assistantIdForRequest = overrideAssistantId ?? (useAssistant ? chosenAssistantId : undefined);

    // Build attachments payload for server-side fetching/parsing
    const attachmentsPayload = attachments
      .map((a) => {
        if (a.isGoogleDrive && a.id) {
          return { name: a.name, type: a.type, driveId: a.id };
        }
        return null;
      })
      .filter(Boolean);

    // If this is the first message, prepend a thinking panel directive for better UX
    const thinkingPrefix = messages.length === 0
      ? `:::thinking\n${generateThinkingBullets(baseText).map(b => `- ${b}`).join('\n')}\n:::\n\n`
      : '';

    // Option C: call Assistants/Responses with file_search
    // Split file ids by type for vision vs retrieval
    const imageIds = attachments.filter(a => (a as any).fileId && (a.type||'').startsWith('image/')).map(a => (a as any).fileId);
    const docIds = attachments.filter(a => (a as any).fileId && !(a.type||'').startsWith('image/')).map(a => (a as any).fileId);

    const res = await fetch("/api/assistants/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assistantId: assistantIdForRequest,
        message: thinkingPrefix + baseText + replyContext,
        fileIds: docIds,
        imageIds,
      }),
    });

    const stableConvId = targetConversationId || currentConvId;

    // If backend returns JSON (non-stream), parse and update once; else stream
    const ct = res.headers.get('content-type') || '';
    let assistantText = "";
    const assistantMsgId = crypto.randomUUID();
    
    // Generate thought process for this assistant
    const thoughtProcess = generateThoughtProcess(chosenAssistantId || assistantId || '', input);
    
    setMessages((prev) => [...prev, { 
      id: assistantMsgId, 
      role: "assistant", 
      content: "",
      thoughtProcess
    }]);

    if (ct.includes('application/json')) {
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        const err = (data?.error?.message || data?.error || `HTTP ${res.status}`);
        setMessages((prev)=> prev.map(m=> m.id===assistantMsgId ? { ...m, content: `Error: ${err}` } : m));
        setLoading(false);
        return;
      }
      assistantText = data.text || data.output_text || '';
      setMessages((prev)=> prev.map(m=> m.id===assistantMsgId ? { ...m, content: assistantText } : m));
      setLoading(false);
    } else if (res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let frameScheduled = false;
      let pendingBuffer = "";
      let lastFlushTs = performance.now();
      let lineBuffer = "";
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (loading) setLoading(false);
          
          pendingBuffer += chunk;
          lineBuffer += chunk;
          
          // Process complete lines
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop() || ""; // Keep the incomplete line in buffer
          
          const now = performance.now();
          const urgent = now - lastFlushTs > 150; // Slightly longer delay for line-by-line
          
          if (lines.length > 0 && (!frameScheduled || urgent)) {
            frameScheduled = true;
            requestAnimationFrame(() => {
              // Add complete lines one by one with a small delay
              let currentLineIndex = 0;
              const addNextLine = () => {
                if (currentLineIndex < lines.length) {
                  const lineToAdd = lines[currentLineIndex] + (currentLineIndex < lines.length - 1 ? '\n' : '');
                  assistantText += lineToAdd;
                  setMessages((prev) => prev.map((m) => (m.id === assistantMsgId ? { ...m, content: assistantText } : m)));
                  bottomRef.current?.scrollIntoView({ behavior: "smooth" });
                  currentLineIndex++;
                  
                  // Add a small delay between lines for better readability
                  if (currentLineIndex < lines.length) {
                    setTimeout(addNextLine, 50); // 50ms delay between lines
                  } else {
                    frameScheduled = false;
                    lastFlushTs = performance.now();
                  }
                } else {
                  frameScheduled = false;
                  lastFlushTs = performance.now();
                }
              };
              addNextLine();
            });
          }
        }
        
        // Process any remaining content
        if (lineBuffer) {
          assistantText += lineBuffer;
          setMessages((prev) => prev.map((m) => (m.id === assistantMsgId ? { ...m, content: assistantText } : m)));
        }
      } finally {
        setLoading(false);
        // Mark thought process as complete
        setMessages((prev) => prev.map((m) => 
          m.id === assistantMsgId && m.thoughtProcess 
            ? { ...m, thoughtProcess: { ...m.thoughtProcess, isComplete: true } }
            : m
        ));
      }
    } else {
      // Try reading text body even if not ok/JSON
      try {
        const raw = await res.text();
        if (raw) {
          setMessages((prev)=> prev.map(m=> m.id===assistantMsgId ? { ...m, content: `Error: ${raw}` } : m));
          setLoading(false);
          return;
        }
      } catch {}
      setLoading(false);
      setMessages((prev)=> prev.map(m=> m.id===assistantMsgId ? { ...m, content: 'No response body' } : m));
    }

    // Persist assistant message when available
    if (assistantText && stableConvId) {
      try {
        const saveResponse = await fetch("/api/chat/save-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "assistant", content: assistantText, conversationId: stableConvId, shouldRename: false }),
        });
        if (saveResponse.ok) {
          const savedMessage = await saveResponse.json();
          setMessages(prev => prev.map(msg => msg.id === assistantMsgId ? { ...msg, id: savedMessage.id } : msg));
          if (savedMessage.id !== assistantMsgId) {
            setMessageFeedbacks(prev => { const ns = { ...prev }; if (prev[assistantMsgId] !== undefined) { ns[savedMessage.id] = prev[assistantMsgId]; delete ns[assistantMsgId]; } return ns; });
          }
          notifyAssistantReply(assistantById(assistantId)?.name, assistantText);
          playUiSound('done');
        }
        loadConversations(assistantId);
      } catch {}
    }
  }

  // Drag and drop handlers
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleAttachment({ target: { files } } as unknown as React.ChangeEvent<HTMLInputElement>);
    }
  };

  

  // Native HTML Chatbar - No React state interference
  const Chatbar: React.FC<{ animateEnter?: boolean; transitionOut?: boolean; variant?: 'home' | 'bottom' }> = ({ animateEnter = false, transitionOut = false, variant = 'bottom' }) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [localInput, setLocalInput] = useState<string>(input);
    useEffect(() => { setLocalInput(input); }, [input]);
    return (
    <div className={`chat-input-container ${variant === 'home' ? 'chatbar--home' : 'chatbar--bottom'} ${animateEnter ? 'chatbar-enter' : ''} ${transitionOut ? 'chatbar-exit' : ''}`}>
      {/* Native HTML chatbar with minimal React */}
      <div 
        className={`chatbar-ref plus-menu-container ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Attachment chips / uploading state */}
        <div className={`chat-ref-attachments`}>
          {attachments.length === 0 && isRecording && (
            <div className="loading-spinner" aria-label="Uploading" />
          )}
          {attachments.map((attachment, index) => (
            <div key={index} className="chat-ref-attachment" onClick={() => setAttachmentPreviewIndex(index)}>
              <div className="chat-ref-attachment-icon">
                {attachment.type?.startsWith('image/') ? '🖼️' : 
                 attachment.type === 'application/pdf' ? '📄' : 
                 attachment.type?.includes('text') ? '📝' : '📎'}
              </div>
              <span className="chat-ref-attachment-name">{attachment.name}</span>
              {typeof attachment.progress === 'number' && attachment.uploaded !== true && (
                <div className="progress" aria-label={`Uploading ${attachment.progress}%`}>
                  <span style={{ width: `${attachment.progress}%` }} />
                </div>
              )}
              <button 
                className="chat-ref-attachment-remove"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  const idKey = attachments[index]?.id || '';
                  const xhr = uploadXhrsRef.current.get(idKey);
                  if (xhr && xhr.readyState !== 4) { try { xhr.abort(); } catch {} }
                  uploadXhrsRef.current.delete(idKey);
                  removeAttachment(index); 
                }}
                title="Remove attachment"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        
        <div className="chat-ref-body">
          {/* Plus icon */}
              <button 
            type="button"
            className="chat-ref-icon"
            onClick={() => setShowPlusMenu(!showPlusMenu)}
            title="Add options"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          
          {/* Auto-expanding textarea, clamps to 3 lines with ellipsis overlay */}
          <textarea
            rows={1}
            placeholder="Ask another question..."
            className="chat-ref-input"
            autoComplete="off"
            inputMode="text"
            aria-multiline="true"
            value={localInput}
            onInput={(e) => {
              const el = e.currentTarget as HTMLTextAreaElement;
              // Auto-grow up to 3 lines (based on 24px line-height)
              const lineHeight = 24; // keep in sync with CSS
              const maxHeight = lineHeight * 3;
              el.style.height = 'auto';
              const next = Math.min(maxHeight, el.scrollHeight);
              el.style.height = `${next}px`;
              // Toggle clamped indicator
              const body = el.parentElement;
              if (body) body.classList.toggle('clamped', el.scrollHeight > maxHeight);
              // Ensure typing stays enabled
              el.readOnly = false;
              // Sync to React state directly
              setLocalInput(el.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const value = (localInput || e.currentTarget.value || '').trim();
                if (value) {
                  handleSend(e, value);
                  const visibleInput = e.currentTarget as HTMLTextAreaElement;
                  if (visibleInput) { visibleInput.value = ''; visibleInput.style.height = '24px'; }
                  setLocalInput('');
                  const body = (e.currentTarget as HTMLTextAreaElement).parentElement; if (body) body.classList.remove('clamped');
                }
              }
            }}
          />
          
          {/* Microphone icon */}
          <button 
            type="button"
            className="chat-ref-icon"
            onClick={() => {}}
            disabled={loading}
            title="Voice input"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2C8.9 2 8 2.9 8 4V10C8 11.1 8.9 12 10 12C11.1 12 12 11.1 12 10V4C12 2.9 11.1 2 10 2Z" fill="currentColor"/>
              <path d="M15 10C15 13.3 12.3 16 10 16C7.7 16 5 13.3 5 10H3C3 13.9 6.1 17 10 17C13.9 17 17 13.9 17 10H15Z" fill="currentColor"/>
            </svg>
          </button>
          
          {/* Send arrow */}
          <button
            type="button"
            className="chat-ref-send"
            disabled={loading}
            onClick={(e) => {
              const area = e.currentTarget.parentElement?.querySelector('textarea.chat-ref-input') as HTMLTextAreaElement | null;
              const value = (localInput || area?.value || '').trim();
              if (value) {
                handleSend(e, value);
                if (area) { area.value = ''; area.style.height = '24px'; }
                setLocalInput('');
                const body = e.currentTarget.parentElement; if (body) body.classList.remove('clamped');
              }
            }}
            title="Send message"
            aria-label="Send message"
          >
            {loading ? (
              <div className="loading-spinner"></div>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10L16 10M12 6L16 10L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
        
        {/* Plus Menu Dropdown */}
        {showPlusMenu && (
          <div className="plus-menu">
            <div className="plus-menu-content">
              <button 
                className="plus-menu-item"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                    fileInputRef.current.click();
                  }
                }}
              >
                <span className="plus-menu-icon">📎</span>
                <span>Add photos & files</span>
              </button>
              <button 
                className="plus-menu-item"
                onClick={handleGoogleDriveSelect}
              >
                <span className="plus-menu-icon">📁</span>
                <span>Add from Google Drive</span>
              </button>
              <div className="plus-menu-divider"></div>
              <button className="plus-menu-item" onClick={() => setShowPlusMenu(false)}>
                <span className="plus-menu-icon">👆</span>
                <span>Agent mode</span>
                <span className="plus-menu-badge">NEW</span>
              </button>
              <button className="plus-menu-item" onClick={() => setShowPlusMenu(false)}>
                <span className="plus-menu-icon">🔭</span>
                <span>Deep research</span>
              </button>
              <button className="plus-menu-item" onClick={() => setShowPlusMenu(false)}>
                <span className="plus-menu-icon">🖼️</span>
                <span>Create image</span>
              </button>
              <button className="plus-menu-item" onClick={() => setShowPlusMenu(false)}>
                <span className="plus-menu-icon">🌐</span>
                <span>Web search</span>
              </button>
              <div className="plus-menu-divider"></div>
              <button className="plus-menu-item" onClick={() => setShowPlusMenu(false)}>
                <span className="plus-menu-icon">•••</span>
                <span>More</span>
                <span className="plus-menu-arrow">{'>'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Hidden input to bridge native HTML with React state */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept="image/*,video/*,.pdf,.doc,.docx,.txt,.webm,.mp4,.ogg,.wav"
        onChange={handleAttachment}
        className="sr-only-input"
        aria-label="Upload attachments"
      />

      {/* Footer Disclaimer */}
      <div className="chatbar-footer">
        <p>
          AXONS AI may display inaccurate information and does not represent the views of others. Please double-check details before relying on them.
        </p>
      </div>
    </div>
  ); };

  return (
    <CustomAuthWrapper>
      <div className={`min-h-screen flex app-container`}>
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? '' : 'closed'} transition-transform duration-300 border-r cascade cascade-1`}>
        {/* Flytip portal element */}
        <div id="sidebar-flytip" className="sidebar-flytip hidden"></div>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-3 border-b border-light sidebar-header">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded border border-light flex items-center justify-center bg-primary">
                <span className="font-bold text-sm text-white">A</span>
              </div>
              <span className="font-semibold text-lg text-primary logo-text">AXONS AI</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto scroll-container">
            <div className="p-3 space-y-1">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-primary hover:bg-hover h-8 text-sm font-medium sidebar-button"
                onClick={() => setShowAssistantPicker(true)}
                aria-label="Start new chat"
                title="New chat"
                data-tooltip="New chat"
                data-testid="sidebar-new-chat"
                data-sidebar-item
              >
                <Plus size={16} className="mr-2" />
                <span className="has-tooltip">New chat</span>
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-primary hover:bg-hover h-8 text-sm font-medium sidebar-button"
                aria-label="Search chats"
                title="Search chats"
                data-tooltip="Search chats"
                data-sidebar-item
                onClick={()=> setShowSearch(true)}
              >
                <Search size={16} className="mr-2" />
                <span className="has-tooltip">Search chats</span>
              </Button>
            </div>

            {/* Assistants Section */}
            <div className="px-3 py-2">
              <div className="text-xs font-semibold uppercase tracking-wide mb-2 text-secondary">Assistants</div>
              <div className="space-y-1">
                {assistantCatalog.map(a => (
                  <button
                    key={a.id}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded text-left assistant-button ${assistantId===a.code? 'selected':''} has-tooltip`}
                    onClick={() => { 
                      setAssistantId(a.code); 
                      setCurrentConvId(undefined); 
                      setMessages([]); 
                      loadConversations(a.code); 
                      setCurrentConversationTitle('New Chat'); 
                    }}
                    data-tooltip={a.name}
                    onMouseEnter={(e)=>{
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const tip = document.getElementById('sidebar-flytip');
                      if(tip){
                        tip.textContent = a.name;
                        tip.style.left = `${rect.right + 12}px`;
                        tip.style.top = `${rect.top + rect.height/2}px`;
                        tip.classList.remove('hidden');
                      }
                    }}
                    onMouseLeave={()=>{
                      const tip = document.getElementById('sidebar-flytip');
                      tip?.classList.add('hidden');
                    }}
                  >
                    {a.avatar ? (
                      <img 
                        src={a.avatar} 
                        alt={a.name} 
                        className="w-6 h-6 rounded-full object-contain bg-[#f2f4f7]" 
                        onError={(e) => {
                          console.log('Sidebar avatar failed to load:', a.name, a.avatar);
                          e.currentTarget.src = '/avatars/BaoBao.jpeg';
                        }}
                      />
                    ) : (
                      <span className="w-6 h-6 rounded-full flex items-center justify-center bg-[#f2f4f7]">{a.emoji}</span>
                    )}
                    <span className="text-sm">{a.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Chats Section */}
            <div className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-primary">Recent</span>
              </div>
              <div className="space-y-1">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="flex items-center group conversation-menu-container"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      const scrollY = window.scrollY || document.documentElement.scrollTop;
                      const scrollX = window.scrollX || document.documentElement.scrollLeft;
                      const x = e.clientX + scrollX;
                      const y = e.clientY + scrollY;
                      setShowConversationMenu({ id: conversation.id, x, y });
                      setRenamingConvId(null);
                    }}
                  >
                    <Button 
                      variant="ghost" 
                      className={`flex-1 justify-start text-primary hover:bg-hover h-8 text-sm font-medium conversation-item has-tooltip ${
                        currentConvId === conversation.id ? 'selected' : ''
                      }`}
                      onClick={() => loadConversation(conversation.id)}
                      aria-label={conversation.title}
                      title={conversation.title}
                      data-tooltip={conversation.title}
                      onMouseEnter={(e)=>{
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const tip = document.getElementById('sidebar-flytip');
                        if(tip){
                          tip.textContent = conversation.title;
                          tip.style.left = `${rect.right + 12}px`;
                          tip.style.top = `${rect.top + rect.height/2}px`;
                          tip.classList.remove('hidden');
                        }
                      }}
                      onMouseLeave={()=>{
                        const tip = document.getElementById('sidebar-flytip');
                        tip?.classList.add('hidden');
                      }}
                    >
                      {assistantById(
                        conversation.assistantId || assistantId
                      )?.avatar ? (
                        <img 
                          src={assistantById(conversation.assistantId || assistantId)?.avatar as string} 
                          alt={assistantById(conversation.assistantId || assistantId)?.name || 'Assistant'} 
                          className="w-4 h-4 rounded-full mr-2 object-contain" 
                          onError={(e) => {
                            console.log('Conversation avatar failed to load:', conversation.title);
                            e.currentTarget.src = '/avatars/BaoBao.jpeg';
                          }}
                        />
                      ) : (
                        <div className="w-4 h-4 bg-[#8a95a8] rounded-full mr-2"></div>
                      )}
                      <span className="truncate">{conversation.title}</span>
                    </Button>
        </div>
                ))}
              </div>
              
            {/* Conversation More Options Menu */}
              {showConversationMenu && typeof window !== 'undefined' && createPortal(
                <div
                  className="conversation-menu is-portal bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-[9999] min-w-56 conversation-menu-container conversation-menu-positioned"
                  style={{ top: showConversationMenu.y, left: showConversationMenu.x }}
                >
                  {renamingConvId === showConversationMenu.id ? (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                          await fetch(`/api/conversations/${renamingConvId}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ title: renameValue.trim() })
                          });
                          await loadConversations(assistantId);
                          if (currentConvId === renamingConvId) setCurrentConversationTitle(renameValue.trim());
                        } finally {
                          setRenamingConvId(null);
                          setShowConversationMenu(null);
                        }
                      }}
                      className="px-3 py-2"
                    >
                      <input
                        autoFocus
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        placeholder="Rename conversation"
                        aria-label="Rename conversation"
                      />
                    </form>
                  ) : (
                    <>
                      <button
                        className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 text-gray-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingConvId(showConversationMenu.id);
                          const conv = conversations.find(c => c.id === showConversationMenu.id);
                          setRenameValue(conv?.title || "");
                        }}
                        aria-label="Rename conversation"
                      >
                        <span>✏️</span>
                        <span>Rename conversation</span>
                      </button>
                      <button
                        className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 text-gray-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          generateConversationTitle(showConversationMenu.id);
                          setShowConversationMenu(null);
                        }}
                        aria-label="Generate better title"
                      >
                        <span>✨</span>
                        <span>Generate better title</span>
                      </button>
                      <button
                        className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-red-50 text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(showConversationMenu.id);
                          setShowConversationMenu(null);
                        }}
                        aria-label="Delete conversation"
                      >
                        <span>🗑️</span>
                        <span>Delete conversation</span>
                      </button>
                    </>
                  )}
                </div>, document.body
              )}

              {/* User Profile footer is moved outside scroll container */}
            </div>
          </div>
          {/* Sidebar Footer (always at bottom) */}
          <div className="p-3 border-t border-light sidebar-footer bg-sidebar">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border border-[#a6b0bf] bg-[#f2f4f7]">
                  {user.image ? (
                    <img 
                      src={user.image}
                      alt={user.name || "User"}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.log('User avatar failed to load:', user.image);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-[#344054] text-sm font-medium">
                      {user.name?.charAt(0) || "U"}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate text-[#344054]">{user.name || "User"}</div>
                  <div className="text-xs text-[#8a95a8] truncate">{user.email}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[#8a95a8] hover:text-[#344054] p-1"
                  onClick={handleSignOut}
                  title="Sign out"
                >
                  <LogOut size={16} />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start text-[#344054] hover:bg-[#e4e7ec] h-8 text-sm font-medium"
                onClick={() => setShowLoginModal(true)}
              >
                <User size={16} className="mr-2" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-w-0 main-content ${sidebarOpen ? '' : 'sidebar-closed'} cascade cascade-2`}>
        {/* Netflix-style Assistant Picker Modal */}
        {showAssistantPicker && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center" aria-modal="true" role="dialog">
            <div className="absolute inset-0 modal-backdrop" onClick={() => setShowAssistantPicker(false)} />
            <div className="relative z-[101] w-full h-full flex flex-col items-center justify-center p-6">
              <div className="assistant-picker-title">Who&apos;s chatting?</div>
              <div className="assistant-picker-grid">
                {assistantCatalog.map((a) => (
                  <button
                    key={a.id}
                    className="assistant-card"
                    aria-label={`Choose ${a.name}`}
                    onMouseEnter={() => playUiSound('hover')}
                    onClick={async () => {
                      playUiSound('select');
                      setAssistantId(a.code);
                      setShowAssistantPicker(false);
                      const createdTitle = `New Chat with ${a.name}`;
                      try {
                        const resp = await fetch('/api/conversations', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ title: createdTitle, assistantId: a.code }),
                        });
                        if (resp.ok) {
                          const conv = await resp.json();
                          setCurrentConvId(conv.id);
                          await loadConversations(a.code);
                          await handleSend(undefined, `Hello, ${a.name}..`, conv.id, a.code);
                        }
                      } catch (e) {}
                    }}
                  >
                    <div className="assistant-avatar">
                      <img 
                        src={a.avatar || '/avatars/BaoBao.jpeg'} 
                        alt={a.name} 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          console.log('Avatar failed to load:', a.name, a.avatar);
                          e.currentTarget.src = '/avatars/BaoBao.jpeg';
                        }}
                        onLoad={() => console.log('Avatar loaded successfully:', a.name, a.avatar)}
                      />
                    </div>
                    <div className="assistant-name">{a.name}</div>
                  </button>
                ))}
              </div>
              <button className="assistant-cancel" onClick={() => setShowAssistantPicker(false)}>Cancel</button>
            </div>
          </div>
        )}
        {/* Universal Search Modal */}
        {showSearch && (
          <>
            <div className="kbar-overlay" onClick={() => setShowSearch(false)} />
            <div className="kbar-panel" role="dialog" aria-modal="true" aria-label="Search">
              <input
                autoFocus
                className="kbar-input"
                placeholder="Search everything…"
                value={searchQuery}
                onChange={(e)=> runSearch(e.target.value)}
                onKeyDown={(e)=>{ if(e.key==='Enter' && searchResults[0]){
                  const first = searchResults[0];
                  if(first.type==='assistant'){ setAssistantId(first.id); setShowSearch(false); }
                  if(first.type==='conversation'){ loadConversation(first.id); setShowSearch(false); }
                  if(first.type==='web'){ window.open(`https://www.google.com/search?q=${encodeURIComponent(first.id)}`,'_blank'); setShowSearch(false); }
                }}}
              />
              {(!searchQuery || searchResults.length===0) && (
                <div className="kbar-suggestions">
                  {["New chat with Babao","Find ‘invoice’ in chats","Upload a PDF","Theme: Dark"].map((s,i)=>(
                    <button key={i} className="kbar-chip" onClick={()=> runSearch(s)}>{s}</button>
                  ))}
                </div>
              )}
              {searchResults.length>0 && (
                <div className="kbar-results" role="listbox" aria-label="Results">
                  <div className="kbar-section">Results</div>
                  {searchResults.map((r, idx)=>(
                    <div key={idx} className="kbar-item" role="option" aria-selected={idx===0}
                      onClick={()=>{
                        if(r.type==='assistant'){ setAssistantId(r.id); setShowSearch(false); }
                        if(r.type==='conversation'){ loadConversation(r.id); setShowSearch(false); }
                        if(r.type==='web'){ window.open(`https://www.google.com/search?q=${encodeURIComponent(r.id)}`,'_blank'); setShowSearch(false); }
                      }}
                    >
                      <div className="kbar-icon">
                        {r.icon ? <img src={r.icon} alt="" className="w-5 h-5 rounded-full"/> : <Search size={16} />}
                      </div>
                      <div className="truncate">{r.title}</div>
                      <div className="kbar-kbd">↩</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        {/* Chat Header */}
        <div className="chat-header cascade cascade-3">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[#f5fafe] hover:bg-[#074e9f]/20"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={16} />
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-[#f5fafe] font-semibold text-lg">{currentConversationTitle}</span>
              <div className="bg-[#07a721] px-2 py-1 rounded-full">
                <span className="text-[#f9fbf9] text-sm font-medium">Online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative" aria-label="Settings">
              <Button variant="ghost" size="sm" className="text-[#f5fafe] hover:bg-[#074e9f]/20"
                onClick={() => setShowPlusMenu(false)}
                onMouseDown={(e)=>{
                  e.preventDefault();
                  const el = document.getElementById('settings-theme-menu');
                  if(el){ el.classList.toggle('hidden'); el.classList.add('plus-menu-dropdown'); }
                }}
                title="Settings"
              >
                <Settings size={16} />
              </Button>
              <div id="settings-theme-menu" className="hidden absolute right-0 mt-2 rounded-lg shadow-lg z-50 min-w-56 plus-menu-dropdown" role="menu" aria-label="Settings">
                <div className="px-3 py-2 text-sm text-primary">Theme</div>
                {['light','dark','system'].map((mode)=> (
                  <button key={mode}
                    className={`w-full text-left px-3 py-2 text-sm text-primary ${theme === mode ? 'bg-blue-50 text-blue-600' : ''}`}
                    onClick={()=>{setTheme(mode as any);(document.getElementById('settings-theme-menu') as HTMLElement)?.classList.add('hidden');}}
                  >{mode}</button>
                ))}
                <div className="px-3 py-2 text-sm text-primary border-t border-[#e4e7ec] mt-1">Preferences</div>
                <button
                  className="w-full text-left px-3 py-2 text-sm flex items-center justify-between"
                  onClick={()=> setPrefSound(!prefSound)}
                >
                  <span className="text-primary">Sound effects</span>
                  <span className={`inline-block w-9 h-5 rounded-full ${prefSound? 'bg-blue-600':'bg-gray-300'}`}
                        role="switch" aria-checked={prefSound ? 'true' : 'false'} aria-label="Toggle sound"/>
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm flex items-center justify-between"
                  onClick={()=> { setPrefNotify(!prefNotify); if(!prefNotify) requestNotificationPermission(); }}
                >
                  <span className="text-primary">Notifications</span>
                  <span className={`inline-block w-9 h-5 rounded-full ${prefNotify? 'bg-blue-600':'bg-gray-300'}`}
                        role="switch" aria-checked={prefNotify ? 'true' : 'false'} aria-label="Toggle notifications"/>
                </button>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-[#f5fafe] hover:bg-[#074e9f]/20">
              <ChevronDown size={16} />
            </Button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col">
              {assistantId && (
                <AssistantWelcome 
                  assistantId={assistantId} 
                  onSuggestionClick={handleSuggestionClick}
                />
              )}
              

              <Chatbar variant="home" animateEnter transitionOut={startingConversation} />

            </div>
          ) : (
            <div className="flex-1 flex flex-col chat-area">
              {/* Chat Messages Area */}
              <div className="flex-1 overflow-y-auto scroll-container" ref={chatScrollRef}>
                <div className="w-full max-w-6xl mx-auto px-8 py-6 space-y-4 chat-messages">
                  {/* Date/Time Separator */}
                  <div className="chat-date-time">
                    <div className="date-badge">
                      {new Date().toLocaleDateString('en-GB')}, {new Date().toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: false 
                      })}
                    </div>
                  </div>
                
                {messages.map((m, idx) => {
                  // Split content into main text and attachments
                  const attachmentMatch = m.content.match(/\n\n📎 ไฟล์แนบ:.*$/);
                  const mainContent = attachmentMatch ? m.content.replace(attachmentMatch[0], '') : m.content;
                  const attachmentContent = attachmentMatch ? attachmentMatch[0] : '';
                  
                  
                  
                  return (
                    <div key={m.id || `message-${idx}`} className="space-y-2">
                      <Message 
                        role={m.role} 
                        content={mainContent}
                        messageId={m.id}
                        feedback={messageFeedbacks[m.id] || m.feedback}
                        onFeedback={m.id ? handleFeedback : undefined}
                        onRightClick={m.id ? handleRightClick : undefined}
                        onOptions={m.id ? handleAssistantOptions : undefined}
                        onReply={m.id ? handleReply : undefined}
                        onRegenerate={m.id ? handleRegenerate : undefined}
                        onDelete={m.id ? handleDeleteMessage : undefined}
                        onCopy={m.id ? handleCopy : undefined}
                        assistantAvatarUrl={assistantById(currentConvId ? conversations.find(c=>c.id===currentConvId)?.assistantId : assistantId)?.avatar}
                      />
                      
                      {/* Show feedback status */}
                      {(messageFeedbacks[m.id] || m.feedback) && (
                        <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} mt-1`}>
                          <div className={`text-xs px-2 py-1 rounded-full ${
                            (messageFeedbacks[m.id] || m.feedback) === 'like' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {(messageFeedbacks[m.id] || m.feedback) === 'like' ? '👍 ถูกใจ' : '👎 ไม่ถูกใจ'}
                          </div>
                        </div>
                      )}
                      {attachmentContent && (
                        <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                            m.role === 'user' 
                              ? 'bg-[#e6f3ff] text-[#1e40af]' 
                              : 'bg-[#f8f9fa] text-[#6b7280]'
                          }`}>
                            <div className="whitespace-pre-line">{attachmentContent}</div>
                          </div>
                        </div>
                      )}
                      {m.role === "assistant" && idx === messages.length - 1 && (
                        <MessageActions text={m.content} onRegenerate={() => setInput(messages[messages.length - 2]?.content ?? "")} />
                      )}
    </div>
  );
                })}
                {loading && (
                  <div className="flex items-start gap-2 py-1 pl-0 pr-10">
                    <div className="avatar">
                      <div className="w-8 h-8 bg-[#f2f4f7] rounded-full flex items-center justify-center border border-[#a6b0bf]">
                        <Bot size={16} className="text-[#344054]" />
                      </div>
                      <div className="avatar-status"></div>
                    </div>
                    <div className="flex-1">
                      <div className="chat-message-bubble assistant">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-[#8a95a8] rounded-full animate-pulse"></div>
                          <div className="w-2 h-2 bg-[#8a95a8] rounded-full animate-pulse animation-delay-200"></div>
                          <div className="w-2 h-2 bg-[#8a95a8] rounded-full animate-pulse animation-delay-400"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} id="chat-bottom-anchor" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area (when there are messages) */}
        {/* Removed old floating bottom bar */}

          {/* Hide bottom chatbar on home (no messages) */}
          {(messages.length > 0 && !holdOnHome) ? (
            <Chatbar variant="bottom" animateEnter={false} />
          ) : null}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          messageId={contextMenu.messageId}
          messageRole={messages.find(m => m.id === contextMenu.messageId)?.role || "user"}
          onClose={handleContextMenuClose}
          onFeedback={handleFeedback}
          onReply={handleReply}
          onRegenerate={handleRegenerate}
          onDelete={handleDeleteMessage}
          onCopy={handleCopy}
          currentFeedback={messageFeedbacks[contextMenu.messageId] || messages.find(m => m.id === contextMenu.messageId)?.feedback}
        />
      )}

      {/* Attachment Preview Modal */}
      {attachmentPreviewIndex !== null && attachments[attachmentPreviewIndex] && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setAttachmentPreviewIndex(null)} />
          <div className="relative z-[201] bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="font-medium text-sm truncate">{attachments[attachmentPreviewIndex].name}</div>
              <button className="text-sm border rounded px-2 py-1" onClick={() => setAttachmentPreviewIndex(null)}>Close</button>
            </div>
            <div className="p-4 overflow-auto max-h-[70vh]">
              {attachments[attachmentPreviewIndex].type?.startsWith('image/') && attachments[attachmentPreviewIndex].file ? (
                <img src={URL.createObjectURL(attachments[attachmentPreviewIndex].file as File)} alt="preview" className="max-w-full h-auto" />
              ) : attachments[attachmentPreviewIndex].type === 'application/pdf' && attachments[attachmentPreviewIndex].file ? (
                <iframe src={URL.createObjectURL(attachments[attachmentPreviewIndex].file as File)} className="w-full h-[70vh] border" title="PDF preview" />
              ) : attachments[attachmentPreviewIndex].url ? (
                <a className="text-blue-600 underline text-sm" href={attachments[attachmentPreviewIndex].url} target="_blank" rel="noreferrer">Open in Drive</a>
              ) : (
                <div className="text-xs text-gray-500">Preview not available.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {assistantOptionsMenu && typeof window !== 'undefined' && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-[9999] min-w-64 assistant-options-positioned"
          style={{ top: assistantOptionsMenu.y, left: assistantOptionsMenu.x }}
          aria-label="Assistant options"
          onMouseLeave={closeAssistantOptions}
        >
          <button 
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100" 
            onClick={() => handleOptionsTryAgain(assistantOptionsMenu.id)}
            aria-label="Try again"
          >↻ Try again</button>
          <button 
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100" 
            onClick={() => handleOptionsAddDetails(assistantOptionsMenu.id)}
            aria-label="Add details"
          >⇡ Add details</button>
          <button 
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100" 
            onClick={() => handleOptionsMoreConcise(assistantOptionsMenu.id)}
            aria-label="More concise"
          >≡ More concise</button>
          <button 
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100" 
            onClick={() => handleOptionsSearchWeb(assistantOptionsMenu.id)}
            aria-label="Search the web"
          >🌐 Search the web</button>
          <div className="border-t border-gray-200 my-1" />
          <div className="px-3 py-1 text-xs text-gray-500">Switch model</div>
          <div className="flex gap-1 px-2 pb-2">
            {['gpt-5','gpt-4o-mini','gpt-4.1-mini'].map(m => (
              <button key={m} className={`px-2 py-1 text-xs rounded border ${model===m? 'bg-blue-50 border-blue-300 text-blue-700':'border-gray-200 text-gray-700'}`} onClick={() => handleOptionsSwitchModel(m)}>{m}</button>
            ))}
    </div>
        </div>
      )}

      {/* Custom Auth Modal */}
      {showLoginModal && (
        <CustomAuthModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => {
            setShowLoginModal(false);
            checkAuthStatus();
          }}
        />
      )}

      {/* Google Drive Picker */}
      {showGoogleDrivePicker && (
        <GoogleDrivePicker
          onFileSelect={handleGoogleDriveFiles}
          onClose={() => setShowGoogleDrivePicker(false)}
        />
      )}
    </CustomAuthWrapper>
  );
}
