"use client";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
// Custom auth - no longer using NextAuth
import { Button } from "@/components/ui/button";
import { Message } from "@/components/chat/Message";
import { ContextMenu } from "@/components/chat/ContextMenu";
import { GoogleDrivePicker, useGoogleDriveAuth } from "@/components/GoogleDrivePicker";
import { Plus, Search, Mic, User, Settings, Menu, ChevronDown, LogOut, Bot } from "lucide-react";
import { CustomAuthWrapper } from "@/components/auth/CustomAuthWrapper";
import { CustomAuthModal } from "@/components/auth/CustomAuthModal";
import { AssistantWelcome } from "@/components/chat/AssistantWelcome";
import { useTheme } from "@/components/ClientThemeProvider";
import GroupChatResponse from "@/components/chat/GroupChatResponse";
import GroupChatWelcome from "@/components/chat/GroupChatWelcome";
import ContextUsage from "@/components/chat/ContextUsage";

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

  const handleSend = async (e?: React.FormEvent, customText?: string, overrideConversationId?: string, overrideAssistantId?: string) => {
    const baseText = customText || input.trim();
    if (!baseText || loading) return;

    setLoading(true);
    setInput('');
    setGroupChatResponse(null); // Clear previous group chat response

    // Create user message
    const userMessage: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: baseText,
    };

    // Add user message to UI immediately
    setMessages(prev => [...prev, userMessage]);

    // Determine which assistant to use
    let chosenAssistantId = assistantId;
    let convoAssistantId = currentConvId ? conversations.find(c => c.id === currentConvId)?.assistantId : undefined;
    
    // In beta mode, detect intent and route to appropriate assistant
    let finalAssistantId = chosenAssistantId;
    if (betaMode && !overrideAssistantId && !convoAssistantId) {
      const detectedIntent = detectAssistantIntent(baseText);
      if (detectedIntent) {
        if (detectedIntent === 'group') {
          setGroupChatMode(true);
          setAssistantId(undefined);
          setDetectedAssistant('group');
        } else {
          finalAssistantId = detectedIntent;
          setDetectedAssistant(detectedIntent);
        }
      }
    }

    // Handle group chat mode
    if (groupChatMode || detectedAssistant === 'group') {
      try {
        console.log('Starting group chat processing...');
        
        // Create or get conversation
        let targetConversationId = currentConvId;
        if (!targetConversationId) {
          let provisionalTitle = 'Group Chat';
          let conversationAssistantId = 'group';
          
          const createResp = await fetch("/api/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: provisionalTitle, assistantId: conversationAssistantId }),
          });
          
          if (createResp.ok) {
            const created = await createResp.json();
            console.log('Group chat conversation created:', created);
            targetConversationId = created.id;
            setCurrentConvId(created.id);
            setCurrentConversationTitle(provisionalTitle);
            
            // Immediately add to sidebar
            setConversations(prev => [created, ...prev]);
            
            setConversationCache(prev => ({
              ...prev,
              [conversationAssistantId]: [created, ...(prev[conversationAssistantId] || [])]
            }));
            
            loadConversations(conversationAssistantId);
          }
        }

        // Save user message
        if (targetConversationId) {
          const userSaveResponse = await fetch('/api/chat/save-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId: targetConversationId,
              role: 'user',
              content: baseText,
            }),
          });

          if (userSaveResponse.ok) {
            const savedUserMessage = await userSaveResponse.json();
            setMessages(prev => prev.map(msg => 
              msg.id === userMessage.id 
                ? { ...msg, id: savedUserMessage.id }
                : msg
            ));
          }
        }

        // Call group chat API
        const groupResponse = await fetch('/api/chat/group', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: baseText,
            conversationId: targetConversationId,
          }),
        });

        if (groupResponse.ok) {
          const groupData = await groupResponse.json();
          console.log('Group chat response received:', groupData);
          
          // Set the group chat response for display
          setGroupChatResponse(groupData.collaborativeResponse);
          
          // Create assistant message with the final answer
          const assistantMessage: ChatMessage = {
            id: `temp-assistant-${Date.now()}`,
            role: 'assistant',
            content: groupData.collaborativeResponse.finalAnswer,
          };

          setMessages(prev => [...prev, assistantMessage]);

          // Save assistant message
          if (targetConversationId) {
            const saveResponse = await fetch('/api/chat/save-message', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                conversationId: targetConversationId,
                role: 'assistant',
                content: groupData.collaborativeResponse.finalAnswer,
              }),
            });

            if (saveResponse.ok) {
              const savedMessage = await saveResponse.json();
              setMessages(prev => prev.map(msg => 
                msg.id === assistantMessage.id 
                  ? { ...msg, id: savedMessage.id }
                  : msg
              ));
            }
          }

          // Show notification
          if (!isTabFocused && notificationPermission === 'granted') {
            showNotification(
              'AI Team has finished collaborating',
              'All 4 AIs have completed their discussion and provided a final answer.',
              undefined
            );
          }

        } else {
          const errorData = await groupResponse.json();
          const errorMessage = `Error: ${errorData.error || 'Failed to process group chat'}`;
          setMessages(prev => [...prev, {
            id: `temp-assistant-${Date.now()}`,
            role: 'assistant',
            content: errorMessage,
          }]);
        }

      } catch (error) {
        console.error('Group chat error:', error);
        
        let errorMessage = 'Failed to process group chat request';
        if (error instanceof Error) {
          if (error.message.includes('JSON')) {
            errorMessage = 'Group chat is taking too long. Please try again with a shorter question.';
          } else if (error.message.includes('504') || error.message.includes('timeout')) {
            errorMessage = 'Group chat request timed out. Please try again.';
          } else {
            errorMessage = error.message;
          }
        }
        
        setMessages(prev => [...prev, {
          id: `temp-assistant-${Date.now()}`,
          role: 'assistant',
          content: `Error: ${errorMessage}`,
        }]);
      }
    } else {
      // Regular single AI chat (existing logic would go here)
      // For now, just show a placeholder
      setMessages(prev => [...prev, {
        id: `temp-assistant-${Date.now()}`,
        role: 'assistant',
        content: 'Single AI chat functionality will be implemented here.',
      }]);
    }

    setLoading(false);
  };

  // Notification functions
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      setNotificationPermission('granted');
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission === 'granted';
    }

    return false;
  };

  const showNotification = async (title: string, body: string, icon?: string) => {
    console.log('Attempting to show notification:', { title, body, isTabFocused, notificationPermission });
    
    if (!isTabFocused && notificationPermission === 'granted') {
      try {
        const notification = new Notification(title, {
          body,
          icon: icon || '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'ai-response',
          requireInteraction: false,
          silent: false
        });

        console.log('Notification shown successfully');

        // Auto-close notification after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);

        // Focus tab when notification is clicked
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch (error) {
        console.warn('Failed to show notification:', error);
      }
    } else if (!isTabFocused) {
      // Store pending notification if permission not granted
      console.log('Storing pending notification:', { title, body });
      setPendingNotification({ title, body, icon });
    } else {
      console.log('Tab is focused, not showing notification');
    }
  };

  const getAssistantName = (assistantId: string | undefined): string => {
    if (!assistantId) return 'AI Assistant';
    if (assistantId === 'asst_sS0Sa5rqQFrrwnwkJ9mULGp0') return 'BaoBao';
    if (assistantId === 'asst_CO7qtWO5QTfgV0Gyv77XQY8q') return 'DeeDee';
    if (assistantId === 'asst_Pi6FrBRHRpvhwSOIryJvDo3T') return 'PungPung';
    if (assistantId === 'asst_4nCaYlt7AA5Ro4pseDCTbKHO') return 'FlowFlow';
    return 'AI Assistant';
  };

  // Create conversation immediately when user starts typing
  const createConversationOnInput = async (inputText: string) => {
    if (!currentConvId && !hasCreatedConversationForInput && inputText.trim()) {
      setHasCreatedConversationForInput(true);
      
      let provisionalTitle = 'New Chat';
      let conversationAssistantId = assistantId;
      
      // Handle group chat and beta mode titles
      if (groupChatMode) {
        provisionalTitle = 'Group Chat';
        conversationAssistantId = 'group';
      } else if (betaMode && !assistantId) {
        provisionalTitle = 'New Chat (Beta)';
        conversationAssistantId = 'beta';
      } else if (assistantId) {
        // Generate proper title with assistant name
        const assistantName = getAssistantName(assistantId);
        provisionalTitle = `New Chat with ${assistantName}`;
      }
      
      try {
        const createResp = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: provisionalTitle, assistantId: conversationAssistantId }),
        });
        
        if (createResp.ok) {
          const created = await createResp.json();
          console.log('Conversation created on input:', created);
          setCurrentConvId(created.id);
          setCurrentConversationTitle(provisionalTitle);
          
          // Immediately add to sidebar without waiting for API reload
          setConversations(prev => [created, ...prev]);
          
          // Also update cache immediately
          if (conversationAssistantId) {
            setConversationCache(prev => ({
              ...prev,
              [conversationAssistantId]: [created, ...(prev[conversationAssistantId] || [])]
            }));
          }
          
          // Background refresh to ensure consistency
          if (conversationAssistantId) {
            loadConversations(conversationAssistantId);
          }
        }
      } catch (error) {
        console.error('Failed to create conversation on input:', error);
        setHasCreatedConversationForInput(false); // Reset on error
      }
    }
  };

  // Intent detection for AI routing in beta mode
  const detectAssistantIntent = (userInput: string): string | null => {
    const input = userInput.toLowerCase();
    
    // Check for manual slash commands first
    if (input.startsWith('/group') || input.startsWith('/all') || input.startsWith('/party')) {
      return 'group'; // Group Chat
    }
    if (input.startsWith('/deedee') || input.startsWith('/research')) {
      return 'asst_sS0Sa5rqQFrrwnwkJ9mULGp0'; // DeeDee
    }
    if (input.startsWith('/baobao') || input.startsWith('/translate') || input.startsWith('/content')) {
      return 'asst_sS0Sa5rqQFrrwnwkJ9mULGp0'; // BaoBao
    }
    if (input.startsWith('/pungpung') || input.startsWith('/analysis') || input.startsWith('/feedback')) {
      return 'asst_Pi6FrBRHRpvhwSOIryJvDo3T'; // PungPung
    }
    if (input.startsWith('/flowflow') || input.startsWith('/design') || input.startsWith('/ui') || input.startsWith('/ux')) {
      return 'asst_4nCaYlt7AA5Ro4pseDCTbKHO'; // FlowFlow
    }
    
    // UX Research & Research keywords
    const researchKeywords = [
      'ux research', 'user research', 'research', 'วิจัย', 'การวิจัย', 'ผู้ใช้', 'user interview',
      'survey', 'questionnaire', 'focus group', 'usability testing', 'a/b test', 'ab test',
      'user persona', 'user journey', 'user story', 'research method', 'research plan'
    ];
    if (researchKeywords.some(keyword => input.includes(keyword))) {
      return 'asst_sS0Sa5rqQFrrwnwkJ9mULGp0'; // DeeDee
    }
    
    // Content & Translation keywords (BaoBao)
    const contentKeywords = [
      'translate', 'แปล', 'ภาษา', 'content', 'ข้อความ', 'คำอธิบาย', 'ระบบ', 'เกษตรกร',
      'farmer', 'back office', 'frontline', 'specialist', 'ผู้เชี่ยวชาญ', 'ทีมหลังบ้าน', 'ทีมหน้าบ้าน',
      'message', 'notification', 'alert', 'warning', 'error', 'success', 'button', 'label'
    ];
    if (contentKeywords.some(keyword => input.includes(keyword))) {
      return 'asst_sS0Sa5rqQFrrwnwkJ9mULGp0'; // BaoBao
    }
    
    // Data Analysis & Feedback keywords (PungPung)
    const analysisKeywords = [
      'feedback', 'csat', 'score', 'analysis', 'analyze', 'สรุป', 'วิเคราะห์', 'ข้อมูล',
      'data', 'report', 'dashboard', 'metric', 'kpi', 'satisfaction', 'rating', 'review',
      'product feedback', 'customer feedback', 'user feedback', 'nps', 'survey result'
    ];
    if (analysisKeywords.some(keyword => input.includes(keyword))) {
      return 'asst_Pi6FrBRHRpvhwSOIryJvDo3T'; // PungPung
    }
    
    // Design & UX/UI keywords (FlowFlow)
    const designKeywords = [
      'design', 'ui', 'ux', 'interface', 'mockup', 'prototype', 'wireframe', 'design system',
      'component', 'style guide', 'color', 'typography', 'layout', 'responsive', 'mobile',
      'ออกแบบ', 'ดีไซน์', 'หน้าจอ', 'ปุ่ม', 'สี', 'ฟอนต์', 'layout', 'component'
    ];
    if (designKeywords.some(keyword => input.includes(keyword))) {
      return 'asst_4nCaYlt7AA5Ro4pseDCTbKHO'; // FlowFlow
    }
    
    return null; // No specific intent detected
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
  
  // Search filter states
  const [searchSortBy, setSearchSortBy] = useState<'relevance' | 'date' | 'title'>('relevance');
  const [searchTitleOnly, setSearchTitleOnly] = useState(false);
  const [searchAssistant, setSearchAssistant] = useState<string>('all');
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [responseId, setResponseId] = useState<string | undefined>(undefined);
  const [assistantId, setAssistantId] = useState<string | undefined>('asst_sS0Sa5rqQFrrwnwkJ9mULGp0'); // Default to BaoBao
  const [betaMode, setBetaMode] = useState<boolean>(false);
  const [groupChatMode, setGroupChatMode] = useState<boolean>(false);
  const [detectedAssistant, setDetectedAssistant] = useState<string | null>(null);
  const [showSlashDropdown, setShowSlashDropdown] = useState<boolean>(false);
  const [slashDropdownPosition, setSlashDropdownPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [isTabFocused, setIsTabFocused] = useState<boolean>(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [pendingNotification, setPendingNotification] = useState<{ title: string; body: string; icon?: string } | null>(null);
  const [hasCreatedConversationForInput, setHasCreatedConversationForInput] = useState<boolean>(false);
  const [groupChatResponse, setGroupChatResponse] = useState<any>(null);
  const babaoAvatar = process.env.NEXT_PUBLIC_AVATAR_BABAO ?? '/avatars/BaoBao.jpeg';
  const deedeeAvatar = process.env.NEXT_PUBLIC_AVATAR_DEEDEE ?? '/avatars/DeeDee.png';
  const pungpungAvatar = process.env.NEXT_PUBLIC_AVATAR_PUNGPUNG ?? '/avatars/PungPung.png';
  const flowflowAvatar = process.env.NEXT_PUBLIC_AVATAR_FLOWFLOW ?? '/avatars/FlowFlow.jpeg';
  const assistantCatalog = [
    { id: 'asst_sS0Sa5rqQFrrwnwkJ9mULGp0', code: 'asst_sS0Sa5rqQFrrwnwkJ9mULGp0', name: 'Babao', emoji: '🍼', avatar: babaoAvatar },
    { id: 'asst_CO7qtWO5QTfgV0Gyv77XQY8q', code: 'asst_CO7qtWO5QTfgV0Gyv77XQY8q', name: 'DeeDee', emoji: '🦊', avatar: deedeeAvatar },
    { id: 'asst_Pi6FrBRHRpvhwSOIryJvDo3T', code: 'asst_Pi6FrBRHRpvhwSOIryJvDo3T', name: 'PungPung', emoji: '🦉', avatar: pungpungAvatar },
    { id: 'asst_4nCaYlt7AA5Ro4pseDCTbKHO', code: 'asst_4nCaYlt7AA5Ro4pseDCTbKHO', name: 'FlowFlow', emoji: '🐙', avatar: flowflowAvatar },
    { id: 'group', code: 'group', name: 'Group Chat', emoji: '🎉', avatar: '/avatars/GroupChat.svg' },
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
  
  // Conversation caching for performance
  const [conversationCache, setConversationCache] = useState<Record<string, Conversation[]>>({});
  const [messagesCache, setMessagesCache] = useState<Record<string, ChatMessage[]>>({});
  const [loadingConversations, setLoadingConversations] = useState<Set<string>>(new Set());
  
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
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowAssistantPicker(false);
      }
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
    setSelectedResultIndex(0); // Reset selection when searching
    if (!q.trim()) { setSearchResults([]); return; }
    
    // Client-side quick search with filtering
    let msgHits = messages
      .filter(m => {
        const content = (m.content||'').toLowerCase();
        const query = q.toLowerCase();
        return searchTitleOnly ? false : content.includes(query);
      })
      .slice(0, 20)
      .map(m => ({ type: 'message', id: m.id, title: m.content.substring(0, 120), date: new Date().toISOString() }));
    
    let assistantHits = assistantCatalog
      .filter(a => {
        const name = a.name.toLowerCase();
        const query = q.toLowerCase();
        if (searchAssistant !== 'all' && a.id !== searchAssistant) return false;
        return name.includes(query);
      })
      .map(a => ({ type: 'assistant', id: a.id, title: a.name, icon: a.avatar, date: new Date().toISOString() }));
    
    let convoHits = (allConversations.length ? allConversations : conversations)
      .filter(c => {
        const title = (c.title||'').toLowerCase();
        const query = q.toLowerCase();
        return title.includes(query);
      })
      .map(c => ({ type: 'conversation', id: c.id, title: c.title, date: c.updatedAt || c.createdAt || new Date().toISOString() }));
    
    // Apply sorting
    const allResults = [...msgHits, ...convoHits, ...assistantHits];
    
    if (searchSortBy === 'title') {
      allResults.sort((a, b) => a.title.localeCompare(b.title));
    } else if (searchSortBy === 'date') {
      allResults.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    // 'relevance' keeps original order
    
    // Web search action (opens in new tab)
    const webHit = { type: 'web', id: q, title: `Search the web for "${q}"` } as any;
    setSearchResults([...allResults, webHit]);
  }, [assistantCatalog, conversations, messages, allConversations, searchSortBy, searchTitleOnly, searchAssistant]);
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

  // Load assistantId from localStorage on mount and setup notifications
  useEffect(() => {
    try {
      const saved = localStorage.getItem("assistantId");
      if (saved) {
        setAssistantId(saved);
        setUseAssistant(true);
      }
    } catch {}

    // Request notification permission on mount
    requestNotificationPermission();

    // Setup tab focus/blur detection
    const handleFocus = () => {
      setIsTabFocused(true);
      // Clear any pending notifications when user returns to tab
      setPendingNotification(null);
    };

    const handleBlur = () => {
      setIsTabFocused(false);
    };

    const handleVisibilityChange = () => {
      setIsTabFocused(!document.hidden);
      if (!document.hidden) {
        setPendingNotification(null);
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
    const targetAssistantId = specificAssistantId || assistantId;
    
    // Check cache first
    if (targetAssistantId && conversationCache[targetAssistantId]) {
      setConversations(conversationCache[targetAssistantId]);
      return conversationCache[targetAssistantId];
    }
    
    // Prevent duplicate loading
    if (targetAssistantId && loadingConversations.has(targetAssistantId)) {
      return conversationCache[targetAssistantId] || [];
    }
    
    if (targetAssistantId) {
      setLoadingConversations(prev => new Set(prev).add(targetAssistantId));
    }
    
    try {
      const url = new URL("/api/conversations", window.location.origin);
      if (targetAssistantId) url.searchParams.set('assistantId', targetAssistantId);
      
      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        
        // Cache the conversations
        if (targetAssistantId) {
          setConversationCache(prev => ({
            ...prev,
            [targetAssistantId]: data
          }));
        }
        
        setConversations(data);
        if (targetAssistantId) {
          setLoadingConversations(prev => {
            const newSet = new Set(prev);
            newSet.delete(targetAssistantId);
            return newSet;
          });
        }
        
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
      if (targetAssistantId) {
        setLoadingConversations(prev => {
          const newSet = new Set(prev);
          newSet.delete(targetAssistantId);
          return newSet;
        });
      }
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
    console.log('Loading conversation:', conversationId);
    // Check message cache first
    if (messagesCache[conversationId]) {
      console.log('Loading from cache:', messagesCache[conversationId].length, 'messages');
      setMessages(messagesCache[conversationId]);
      setCurrentConvId(conversationId);
      return;
    }
    
    try {
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (response.ok) {
        const conversation = await response.json();
        console.log('Loaded conversation from API:', conversation.messages.length, 'messages');
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
        console.log('Formatted messages:', formattedMessages.length, 'messages');
        
        // Cache the messages
        setMessagesCache(prev => ({
          ...prev,
          [conversationId]: formattedMessages
        }));
        
        setMessages(formattedMessages);
        
        // Update current conversation title
        setCurrentConversationTitle(conversation.title);
        
        // Reset conversation creation flag when loading existing conversation
        setHasCreatedConversationForInput(false);
        
        // Check if this was a group chat conversation and restore mode
        if (conversation.assistantId === 'group' || conversation.title?.includes('Group Chat')) {
          setGroupChatMode(true);
          setBetaMode(true);
          setAssistantId(undefined);
          setDetectedAssistant('group');
        } else if (conversation.assistantId === 'beta' || conversation.title?.includes('Beta')) {
          setBetaMode(true);
          setGroupChatMode(false);
          setAssistantId(undefined);
          setDetectedAssistant(null);
        } else {
          // Regular assistant conversation
          setBetaMode(false);
          setGroupChatMode(false);
          setAssistantId(conversation.assistantId || assistantId);
          setDetectedAssistant(null);
        }
        
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
    
    // Reset modes when creating new conversation
    setBetaMode(false);
    setGroupChatMode(false);
    setDetectedAssistant(null);
    setHasCreatedConversationForInput(false);
    
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
      console.log('Deleting conversation:', conversationId);
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        console.log('Conversation deleted successfully');
        
        // Remove from current conversations list immediately
        setConversations(prev => prev.filter(c => c.id !== conversationId));
        
        // Clear conversation cache for ALL assistants immediately
        setConversationCache(prev => {
          const newCache = { ...prev };
          Object.keys(newCache).forEach(assistantId => {
            newCache[assistantId] = newCache[assistantId].filter(c => c.id !== conversationId);
          });
          return newCache;
        });
        
        // Clear messages cache
        setMessagesCache(prev => {
          const newCache = { ...prev };
          delete newCache[conversationId];
          return newCache;
        });
        
        if (currentConvId === conversationId) {
          // Clear the current chat; do not auto-create a new conversation
          setCurrentConvId(undefined);
          setMessages([]);
          setCurrentConversationTitle('New Chat');
        }
        
        // Force refresh all assistant conversations to ensure consistency
        Object.keys(conversationCache).forEach(assistantId => {
          loadConversations(assistantId);
        });
          } else {
        console.error('Failed to delete conversation:', response.status, await response.text());
          }
      } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

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
              
              // Create conversation immediately when user starts typing
              createConversationOnInput(el.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (e.ctrlKey || e.metaKey) {
                  // Ctrl+Enter or Cmd+Enter to send
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
                // Regular Enter allows new lines (default behavior)
              }
            }}
            onPaste={(e) => {
              // Handle Excel/Google Sheets data formatting
              const pastedText = e.clipboardData.getData('text');
              
              // Check if the pasted text looks like tabular data (contains tabs and newlines)
              if (pastedText.includes('\t') && pastedText.includes('\n')) {
                e.preventDefault();
                
                // Parse the tabular data
                const rows = pastedText.split('\n').filter(row => row.trim().length > 0);
                if (rows.length > 1) {
                  // Convert to markdown table
                  const formattedTable = rows.map((row, index) => {
                    const cells = row.split('\t').map(cell => cell.trim());
                    return '| ' + cells.join(' | ') + ' |';
                  }).join('\n');
                  
                  // Add markdown table header separator for rows after the first
                  const tableWithSeparator = formattedTable.split('\n').map((row, index) => {
                    if (index === 1) {
                      const cellCount = (row.match(/\|/g) || []).length - 1;
                      const separator = '|' + ' --- |'.repeat(cellCount);
                      return row + '\n' + separator;
                    }
                    return row;
                  }).join('\n');
                  
                  // Insert the formatted table into the input
                  const textarea = e.currentTarget as HTMLTextAreaElement;
                  const start = textarea.selectionStart || 0;
                  const end = textarea.selectionEnd || 0;
                  const currentValue = textarea.value;
                  
                  const newValue = currentValue.substring(0, start) + 
                    '\n\n' + tableWithSeparator + '\n\n' + 
                    currentValue.substring(end);
                  
                  textarea.value = newValue;
                  setLocalInput(newValue);
                  
                  // Set cursor position after the table
                  const newCursorPos = start + tableWithSeparator.length + 4;
                  setTimeout(() => {
                    textarea.setSelectionRange(newCursorPos, newCursorPos);
                  }, 0);
                } else {
                  // Single row - just paste as is
                  document.execCommand('insertText', false, pastedText);
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
              <button 
                className="plus-menu-item"
                onClick={() => {
                  setBetaMode(true);
                  setAssistantId(undefined);
                  setCurrentConvId(undefined);
                  setMessages([]);
                  setCurrentConversationTitle('New Chat (Beta)');
                  setDetectedAssistant(null);
                  setGroupChatMode(false);
                  setShowPlusMenu(false);
                }}
              >
                <span className="plus-menu-icon">🚀</span>
                <span>New Chat (Beta)</span>
                <span className="plus-menu-badge">AI ROUTER</span>
              </button>
              <button 
                className="plus-menu-item"
                onClick={() => {
                  setGroupChatMode(true);
                  setBetaMode(true);
                  setAssistantId(undefined);
                  setCurrentConvId(undefined);
                  setMessages([]);
                  setCurrentConversationTitle('Group Chat');
                  setDetectedAssistant('group');
                  setShowPlusMenu(false);
                }}
              >
                <span className="plus-menu-icon">🎉</span>
                <span>Group Chat</span>
                <span className="plus-menu-badge">ALL AIs</span>
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

      {/* Context Usage Display */}
      {messages.length > 0 && (
        <div className="context-usage-container">
          <ContextUsage 
            messages={messages} 
            assistantId={assistantId}
          />
        </div>
      )}

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
                    onClick={async () => { 
                      if (a.code === 'group') {
                        // Special handling for Group Chat
                        setAssistantId('group');
                        setGroupChatMode(true);
                        setBetaMode(true);
                        setCurrentConvId(undefined);
                        setMessages([]);
                        setCurrentConversationTitle('Group Chat');
                        setDetectedAssistant('group');
                        
                        // Load group chat conversations
                        if (conversationCache['group']) {
                          setConversations(conversationCache['group']);
                        } else {
                          setConversations([]);
                        }
                        await loadConversations('group');
                      } else {
                        // Regular assistant handling
                      setAssistantId(a.code); 
                      setCurrentConvId(undefined); 
                      setMessages([]); 
                      setCurrentConversationTitle('New Chat'); 
                        setGroupChatMode(false);
                        setBetaMode(false);
                        setDetectedAssistant(null);
                        
                        // Load conversations with caching for faster switching
                        // Show immediate feedback if cached, otherwise show loading
                        if (conversationCache[a.code]) {
                          setConversations(conversationCache[a.code]);
                        } else {
                          // Clear current conversations while loading
                          setConversations([]);
                        }
                        await loadConversations(a.code);
                      }
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
                    {a.code === 'group' && (
                      <span className="ml-auto px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 rounded-full">
                        BETA
                      </span>
                    )}
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
                
                {/* Show loading indicator when conversations are being loaded */}
                {loadingConversations.has(assistantId || '') && conversations.length === 0 && (
                  <div className="px-2 py-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                      <span className="text-sm">Loading conversations...</span>
                    </div>
                  </div>
                )}
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" aria-modal="true" role="dialog">
            <div className="absolute inset-0" onClick={() => setShowAssistantPicker(false)} />
            <div className="relative z-[101] w-full max-w-4xl h-full max-h-[80vh] flex flex-col items-center justify-center p-6">
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
                      setShowAssistantPicker(false);
                      
                      if (a.code === 'group') {
                        // Special handling for Group Chat
                        setAssistantId('group');
                        setGroupChatMode(true);
                        setBetaMode(true);
                        setCurrentConvId(undefined);
                        setMessages([]);
                        setCurrentConversationTitle('Group Chat');
                        setDetectedAssistant('group');
                        
                        // Load group chat conversations
                        if (conversationCache['group']) {
                          setConversations(conversationCache['group']);
                        } else {
                          setConversations([]);
                        }
                        await loadConversations('group');
                      } else {
                        // Regular assistant handling
                        setAssistantId(a.code);
                        setGroupChatMode(false);
                        setBetaMode(false);
                        setDetectedAssistant(null);
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
                      }
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
                    <div className="assistant-name">
                      {a.name}
                      {a.code === 'group' && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 rounded-full">
                          BETA
                        </span>
                      )}
                    </div>
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
              {/* Search Header */}
              <div className="search-header">
                <div className="search-input-container">
                  <div className="search-input-wrapper">
                    <Search className="search-icon" size={20} />
              <input
                autoFocus
                      className="search-input"
                      placeholder="Search or ask a question in AXIO-GPT..."
                value={searchQuery}
                onChange={(e)=> runSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setSelectedResultIndex(prev => Math.min(prev + 1, searchResults.length - 1));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setSelectedResultIndex(prev => Math.max(prev - 1, 0));
                        } else if (e.key === 'Enter' && searchResults[selectedResultIndex]) {
                          e.preventDefault();
                          const selected = searchResults[selectedResultIndex];
                          if (selected.type === 'assistant') { 
                            setAssistantId(selected.id); 
                            setShowSearch(false); 
                          }
                          if (selected.type === 'conversation') { 
                            loadConversation(selected.id); 
                            setShowSearch(false); 
                          }
                          if (selected.type === 'web') { 
                            window.open(`https://www.google.com/search?q=${encodeURIComponent(selected.id)}`, '_blank'); 
                            setShowSearch(false); 
                          }
                        }
                      }}
                    />
                    <Menu className="search-menu-icon" size={20} />
                </div>
                </div>
                
                {/* Filter and Sort Options */}
                <div className="search-filters">
                  <button 
                    className={`filter-btn ${searchSortBy !== 'relevance' ? 'active' : ''}`}
                    onClick={() => {
                      const sortOptions = ['relevance', 'date', 'title'];
                      const currentIndex = sortOptions.indexOf(searchSortBy);
                      const nextIndex = (currentIndex + 1) % sortOptions.length;
                      setSearchSortBy(sortOptions[nextIndex] as any);
                      if (searchQuery) runSearch(searchQuery);
                    }}
                  >
                    <ChevronDown size={14} />
                    Sort {searchSortBy !== 'relevance' && `(${searchSortBy})`}
                  </button>
                  <button 
                    className={`filter-btn ${searchTitleOnly ? 'active' : ''}`}
                    onClick={() => {
                      setSearchTitleOnly(!searchTitleOnly);
                      if (searchQuery) runSearch(searchQuery);
                    }}
                  >
                    Aa Title only
                  </button>
                  <button 
                    className={`filter-btn ${searchAssistant !== 'all' ? 'active' : ''}`}
                    onClick={() => {
                      const assistantOptions = ['all', ...assistantCatalog.map(a => a.id)];
                      const currentIndex = assistantOptions.indexOf(searchAssistant);
                      const nextIndex = (currentIndex + 1) % assistantOptions.length;
                      setSearchAssistant(assistantOptions[nextIndex]);
                      if (searchQuery) runSearch(searchQuery);
                    }}
                  >
                    <Bot size={14} />
                    Assistant {searchAssistant !== 'all' && `(${assistantCatalog.find(a => a.id === searchAssistant)?.name})`}
                    <ChevronDown size={14} />
                  </button>
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length>0 && (
                <div className="search-results" role="listbox" aria-label="Results">
                  {/* Today Section */}
                  {searchResults.filter(r => r.type === 'assistant').length > 0 && (
                    <>
                      <div className="result-section-header">Today</div>
                      {searchResults.filter(r => r.type === 'assistant').map((r, idx)=>(
                        <div 
                          key={idx} 
                          className={`search-result-item ${searchResults.indexOf(r) === selectedResultIndex ? 'selected' : ''}`} 
                          role="option" 
                          aria-selected={searchResults.indexOf(r) === selectedResultIndex}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedResultIndex(searchResults.indexOf(r));
                        if(r.type==='assistant'){ setAssistantId(r.id); setShowSearch(false); }
                          }}
                        >
                          <div className="result-icon">
                            {r.icon ? <img src={r.icon} alt="" className="w-6 h-6 rounded-full"/> : <Bot size={16} />}
                          </div>
                          <div className="result-content">
                            <div className="result-title">{r.title}</div>
                            <div className="result-meta">AI Assistant</div>
                          </div>
                          <div className="result-actions">
                            <button 
                              className="action-btn" 
                              title="Select"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedResultIndex(searchResults.indexOf(r));
                                if(r.type==='assistant'){ setAssistantId(r.id); setShowSearch(false); }
                              }}
                            >
                              ↑↓
                            </button>
                            <button 
                              className="action-btn" 
                              title="Open"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedResultIndex(searchResults.indexOf(r));
                                if(r.type==='assistant'){ setAssistantId(r.id); setShowSearch(false); }
                              }}
                            >
                              →
                            </button>
                            <button 
                              className="action-btn" 
                              title="Open in new tab"
                              onClick={(e) => {
                                e.stopPropagation();
                                if(r.type==='assistant'){ 
                                  window.open(`/assistant/${r.id}`, '_blank'); 
                                  setShowSearch(false); 
                                }
                              }}
                            >
                              ↗
                            </button>
                            <button 
                              className="action-btn" 
                              title="Copy link"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(`${window.location.origin}/assistant/${r.id}`);
                              }}
                            >
                              🔗
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Conversations Section */}
                  {searchResults.filter(r => r.type === 'conversation').length > 0 && (
                    <>
                      <div className="result-section-header">Recent Conversations</div>
                      {searchResults.filter(r => r.type === 'conversation').map((r, idx)=>(
                        <div 
                          key={idx} 
                          className={`search-result-item ${searchResults.indexOf(r) === selectedResultIndex ? 'selected' : ''}`} 
                          role="option" 
                          aria-selected={searchResults.indexOf(r) === selectedResultIndex}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedResultIndex(searchResults.indexOf(r));
                        if(r.type==='conversation'){ loadConversation(r.id); setShowSearch(false); }
                          }}
                        >
                          <div className="result-icon">
                            <Search size={16} />
                          </div>
                          <div className="result-content">
                            <div className="result-title">{r.title}</div>
                            <div className="result-meta">Conversation</div>
                          </div>
                          <div className="result-actions">
                            <button 
                              className="action-btn" 
                              title="Select"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedResultIndex(searchResults.indexOf(r));
                                if(r.type==='conversation'){ loadConversation(r.id); setShowSearch(false); }
                              }}
                            >
                              ↑↓
                            </button>
                            <button 
                              className="action-btn" 
                              title="Open"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedResultIndex(searchResults.indexOf(r));
                                if(r.type==='conversation'){ loadConversation(r.id); setShowSearch(false); }
                              }}
                            >
                              →
                            </button>
                            <button 
                              className="action-btn" 
                              title="Open in new tab"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`/conversation/${r.id}`, '_blank');
                              }}
                            >
                              ↗
                            </button>
                            <button 
                              className="action-btn" 
                              title="Copy link"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(`${window.location.origin}/conversation/${r.id}`);
                              }}
                            >
                              🔗
                            </button>
                          </div>
                          <div className="result-date">Today</div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Web Search Section */}
                  {searchResults.filter(r => r.type === 'web').length > 0 && (
                    <>
                      <div className="result-section-header">Web Search</div>
                      {searchResults.filter(r => r.type === 'web').map((r, idx)=>(
                        <div 
                          key={idx} 
                          className={`search-result-item ${searchResults.indexOf(r) === selectedResultIndex ? 'selected' : ''}`} 
                          role="option" 
                          aria-selected={searchResults.indexOf(r) === selectedResultIndex}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedResultIndex(searchResults.indexOf(r));
                        if(r.type==='web'){ window.open(`https://www.google.com/search?q=${encodeURIComponent(r.id)}`,'_blank'); setShowSearch(false); }
                      }}
                    >
                          <div className="result-icon">
                            🌐
                      </div>
                          <div className="result-content">
                            <div className="result-title">{r.title}</div>
                            <div className="result-meta">Web Search</div>
                          </div>
                          <div className="result-actions">
                            <button 
                              className="action-btn" 
                              title="Open"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedResultIndex(searchResults.indexOf(r));
                                if(r.type==='web'){ 
                                  window.open(`https://www.google.com/search?q=${encodeURIComponent(r.id)}`,'_blank'); 
                                  setShowSearch(false); 
                                }
                              }}
                            >
                              →
                            </button>
                            <button 
                              className="action-btn" 
                              title="Open in new tab"
                              onClick={(e) => {
                                e.stopPropagation();
                                if(r.type==='web'){ 
                                  window.open(`https://www.google.com/search?q=${encodeURIComponent(r.id)}`,'_blank'); 
                                  setShowSearch(false); 
                                }
                              }}
                            >
                              ↗
                            </button>
                            <button 
                              className="action-btn" 
                              title="Copy link"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(`https://www.google.com/search?q=${encodeURIComponent(r.id)}`);
                              }}
                            >
                              🔗
                            </button>
                          </div>
                    </div>
                  ))}
                    </>
                  )}
                </div>
              )}

              {/* Suggestions when no search query */}
              {(!searchQuery || searchResults.length===0) && (
                <div className="search-suggestions">
                  <div className="suggestion-section">
                    <div className="suggestion-header">Quick Actions</div>
                    <div className="suggestion-grid">
                      <button 
                        className="suggestion-chip" 
                        onClick={() => {
                          // Find BaoBao assistant and switch to it
                          const baoBaoAssistant = assistantCatalog.find(a => a.name.toLowerCase().includes('baobao'));
                          if (baoBaoAssistant) {
                            setAssistantId(baoBaoAssistant.id);
                            setShowSearch(false);
                          }
                        }}
                      >
                        New chat with BaoBao
                      </button>
                      <button 
                        className="suggestion-chip" 
                        onClick={() => {
                          runSearch('invoice');
                        }}
                      >
                        Find 'invoice' in chats
                      </button>
                      <button 
                        className="suggestion-chip" 
                        onClick={() => {
                          // Trigger file upload
                          const fileInput = document.createElement('input');
                          fileInput.type = 'file';
                          fileInput.accept = '.pdf,.txt,.doc,.docx';
                          fileInput.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              // Handle file upload - you can implement file processing here
                              console.log('File selected:', file.name);
                              // For now, just close the search
                              setShowSearch(false);
                            }
                          };
                          fileInput.click();
                        }}
                      >
                        Upload a PDF
                      </button>
                      <button 
                        className="suggestion-chip" 
                        onClick={() => {
                          // Toggle theme
                          const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
                          const newTheme = currentTheme === 'light' ? 'dark' : 'light';
                          document.documentElement.setAttribute('data-theme', newTheme);
                          localStorage.setItem('theme', newTheme);
                          setShowSearch(false);
                        }}
                      >
                        {(() => {
                          const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
                          return currentTheme === 'light' ? 'Switch to dark theme' : 'Switch to light theme';
                        })()}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Keyboard Shortcuts Footer */}
              <div className="search-footer">
                <div className="shortcut-item">
                  <span className="shortcut-key">↑↓</span>
                  <span className="shortcut-text">Select</span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-key">→</span>
                  <span className="shortcut-text">Open</span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-key">↗</span>
                  <span className="shortcut-text">Open in new tab</span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-key">🔗</span>
                  <span className="shortcut-text">L Copy link</span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-key">K</span>
                  <span className="shortcut-text">Command Search</span>
                </div>
              </div>
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
              {betaMode && (
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-2 py-1 rounded-full">
                  <span className="text-white text-xs font-medium">🚀 BETA</span>
                </div>
              )}
              {groupChatMode && (
                <div className="bg-gradient-to-r from-green-500 to-blue-500 px-2 py-1 rounded-full">
                  <span className="text-white text-xs font-medium">🎉 Group Chat</span>
                </div>
              )}
              {detectedAssistant && betaMode && !groupChatMode && (
                <div className="bg-blue-500 px-2 py-1 rounded-full">
                  <span className="text-white text-xs font-medium">
                    {detectedAssistant === 'asst_sS0Sa5rqQFrrwnwkJ9mULGp0' ? '🔬 DeeDee' :
                     detectedAssistant === 'asst_Pi6FrBRHRpvhwSOIryJvDo3T' ? '📊 PungPung' :
                     detectedAssistant === 'asst_4nCaYlt7AA5Ro4pseDCTbKHO' ? '🎨 FlowFlow' : '🍼 BaoBao'}
                  </span>
                </div>
              )}
              {pendingNotification && (
                <div className="bg-orange-500 px-2 py-1 rounded-full animate-pulse">
                  <span className="text-white text-xs font-medium">🔔 New Response</span>
                </div>
              )}
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
                  onClick={async () => {
                    console.log('Current notification permission:', notificationPermission);
                    console.log('Browser supports notifications:', 'Notification' in window);
                    
                    const granted = await requestNotificationPermission();
                    console.log('Permission request result:', granted);
                    
                    if (granted) {
                      alert('Notifications enabled! You will receive alerts when AI responses are complete.\n\nCurrent permission status: ' + Notification.permission);
                    } else {
                      alert('Notifications were denied or not supported.\n\nCurrent permission status: ' + Notification.permission + '\n\nYou can enable them in your browser settings.');
                    }
                    (document.getElementById('settings-theme-menu') as HTMLElement)?.classList.add('hidden');
                  }}
                >
                  <span>🔔 Notifications</span>
                  <span className="text-xs text-gray-500">
                    {notificationPermission === 'granted' ? 'Enabled' : notificationPermission === 'denied' ? 'Denied' : 'Not Set'}
                  </span>
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm flex items-center justify-between"
                  onClick={async () => {
                    // Force show test notification regardless of focus state
                    if (notificationPermission === 'granted') {
                      try {
                        const notification = new Notification('Test Notification', {
                          body: 'This is a test notification to verify the system is working!',
                          icon: '/favicon.ico',
                          badge: '/favicon.ico',
                          tag: 'test-notification',
                          requireInteraction: false,
                          silent: false
                        });

                        // Auto-close notification after 5 seconds
                        setTimeout(() => {
                          notification.close();
                        }, 5000);

                        // Focus tab when notification is clicked
                        notification.onclick = () => {
                          window.focus();
                          notification.close();
                        };
                        
                        alert('Test notification sent! Check if you received it.');
                      } catch (error) {
                        console.error('Failed to show test notification:', error);
                        alert('Failed to show notification: ' + error);
                      }
                    } else {
                      alert('Notifications are not enabled. Please enable notifications first.');
                    }
                    (document.getElementById('settings-theme-menu') as HTMLElement)?.classList.add('hidden');
                  }}
                >
                  <span>🧪 Test Notification</span>
                  <span className="text-xs text-gray-500">Click to test</span>
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm flex items-center justify-between"
                  onClick={() => {
                    const debugInfo = `
Notification Debug Info:
- Browser Support: ${'Notification' in window ? 'Yes' : 'No'}
- Permission Status: ${Notification.permission}
- Tab Focused: ${isTabFocused}
- State Permission: ${notificationPermission}
- Pending Notification: ${pendingNotification ? 'Yes' : 'No'}

Check browser console for detailed logs.
                    `;
                    alert(debugInfo);
                    console.log('Notification Debug Info:', {
                      browserSupport: 'Notification' in window,
                      permission: Notification.permission,
                      tabFocused: isTabFocused,
                      statePermission: notificationPermission,
                      pendingNotification
                    });
                    (document.getElementById('settings-theme-menu') as HTMLElement)?.classList.add('hidden');
                  }}
                >
                  <span>🔍 Debug Info</span>
                  <span className="text-xs text-gray-500">Check status</span>
                </button>
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
              {groupChatMode && !assistantId ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-12">
                  <div className="w-24 h-24 rounded-full mb-6 overflow-hidden border-2 border-green-200 dark:border-green-700 shadow-lg bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
                    <span className="text-4xl">🎉</span>
                  </div>
                  
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
                  
                  <div className="w-full max-w-4xl">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 text-center">
                        AI Team Members
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <span className="text-3xl mb-2 block">🍼</span>
                          <div className="font-medium text-blue-900 dark:text-blue-100">BaoBao</div>
                          <div className="text-sm text-blue-700 dark:text-blue-300">UX Writer</div>
                        </div>
                        <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <span className="text-3xl mb-2 block">🔬</span>
                          <div className="font-medium text-red-900 dark:text-red-100">DeeDee</div>
                          <div className="text-sm text-red-700 dark:text-red-300">UX Researcher</div>
                        </div>
                        <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                          <span className="text-3xl mb-2 block">📊</span>
                          <div className="font-medium text-orange-900 dark:text-orange-100">PungPung</div>
                          <div className="text-sm text-orange-700 dark:text-orange-300">UX Analyst</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <span className="text-3xl mb-2 block">🎨</span>
                          <div className="font-medium text-purple-900 dark:text-purple-100">FlowFlow</div>
                          <div className="text-sm text-purple-700 dark:text-purple-300">UX/UI Designer</div>
                        </div>
                      </div>
                      
                      <div className="mt-6 text-center">
                        <button
                          onClick={() => {
                            setGroupChatMode(false);
                            setBetaMode(false);
                            setAssistantId(process.env.NEXT_PUBLIC_ASSISTANT_ID as string | undefined);
                            setCurrentConversationTitle('New Chat');
                            setDetectedAssistant(null);
                          }}
                          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline"
                        >
                          ออกจากโหมด Group Chat
                            </button>
                          </div>
                        </div>
                      </div>
                  </div>
              ) : betaMode && !assistantId ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-12">
                  <div className="w-24 h-24 rounded-full mb-6 overflow-hidden border-2 border-purple-200 dark:border-purple-700 shadow-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-4xl">🚀</span>
                </div>
                  
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    New Chat (Beta)
                  </h1>
                  
                  <div className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 text-center">
                    AI Router - เลือก AI ที่เหมาะสมโดยอัตโนมัติ
                        </div>
                  
                  <div className="text-gray-700 dark:text-gray-300 mb-8 max-w-2xl text-center leading-relaxed">
                    ระบบจะช่วยวิเคราะห์คำถามของคุณและเรียกใช้ AI ที่เหมาะสมที่สุด<br/>
                    หรือใช้คำสั่ง / เพื่อเลือก AI เองได้เลย!
                          </div>
                  
                  <div className="w-full max-w-6xl">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 text-center">
                        คำสั่ง / สำหรับเลือก AI
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <span className="text-2xl">🔬</span>
                            <div>
                              <div className="font-medium text-blue-900 dark:text-blue-100">/deedee</div>
                              <div className="text-sm text-blue-700 dark:text-blue-300">UX Research & การวิจัย</div>
                        </div>
                      </div>
                          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <span className="text-2xl">🍼</span>
                            <div>
                              <div className="font-medium text-green-900 dark:text-green-100">/baobao</div>
                              <div className="text-sm text-green-700 dark:text-green-300">แปลภาษา & ข้อความ</div>
                  </div>
                </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                            <span className="text-2xl">📊</span>
                            <div>
                              <div className="font-medium text-orange-900 dark:text-orange-100">/pungpung</div>
                              <div className="text-sm text-orange-700 dark:text-orange-300">วิเคราะห์ข้อมูล & Feedback</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <span className="text-2xl">🎨</span>
                            <div>
                              <div className="font-medium text-purple-900 dark:text-purple-100">/flowflow</div>
                              <div className="text-sm text-purple-700 dark:text-purple-300">UX/UI Design & ออกแบบ</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg">
                            <span className="text-2xl">🎉</span>
                            <div>
                              <div className="font-medium text-green-900 dark:text-green-100">/group</div>
                              <div className="text-sm text-green-700 dark:text-green-300">All AIs Working Together</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-6 text-center">
                        <button
                          onClick={() => {
                            setBetaMode(false);
                            setAssistantId(process.env.NEXT_PUBLIC_ASSISTANT_ID as string | undefined);
                            setCurrentConversationTitle('New Chat');
                            setDetectedAssistant(null);
                          }}
                          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline"
                        >
                          ออกจากโหมด Beta
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : assistantId && assistantId === 'group' ? (
                <GroupChatWelcome 
                  onSuggestionClick={handleSuggestionClick}
                  recentConversations={conversations.slice(0, 5)}
                  onConversationClick={loadConversation}
                />
              ) : assistantId && (
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
    </div>
  );
                })}
                
                {/* Group Chat Response Display */}
                {groupChatResponse && !loading && (
                  <div className="group-chat-response-container">
                    <GroupChatResponse response={groupChatResponse} />
                  </div>
                )}
                
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
                        <div className="flex items-center gap-2 text-gray-500">
                          <span>Thinking</span>
                          <div className="flex items-center gap-1">
                            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
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
