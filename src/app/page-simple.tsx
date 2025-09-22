"use client";
import { useMemo, useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Message } from "@/components/chat/Message";
import { MessageActions } from "@/components/chat/MessageActions";
import { Input } from "@/components/ui/input";
import { Plus, Search, Mic, Volume2, User, Settings, Menu, ChevronDown } from "lucide-react";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string };

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [responseId, setResponseId] = useState<string | undefined>(undefined);
  const [assistantId, setAssistantId] = useState<string | undefined>(process.env.NEXT_PUBLIC_ASSISTANT_ID as string | undefined);
  const [assistantIdInput, setAssistantIdInput] = useState<string>(assistantId ?? "");
  const [useAssistant, setUseAssistant] = useState<boolean>(!!assistantId);
  const [model] = useState<string>("gpt-5");
  const [instructions] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const title = useMemo(() => process.env.NEXT_PUBLIC_APP_NAME ?? "AXIO-GPT", []);

  // Load assistantId from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("assistantId");
      if (saved) {
        setAssistantId(saved);
        setAssistantIdInput(saved);
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

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        messages: [...messages, userMessage].map(({ role, content }) => ({ role, content })), 
        previousResponseId: responseId, 
        model, 
        instructions, 
        assistantId: useAssistant ? assistantId : undefined
      }),
    });

    if (!res.ok || !res.body) {
      setLoading(false);
      return;
    }

    const newResponseId = res.headers.get("x-response-id");
    if (newResponseId) setResponseId(newResponseId);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let assistantText = "";
    const assistantMsgId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantMsgId, role: "assistant", content: "" }]);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        assistantText += chunk;
        setMessages((prev) => prev.map((m) => (m.id === assistantMsgId ? { ...m, content: assistantText } : m)));
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#202123] text-white flex">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? '' : 'closed'} transition-transform duration-300 border-r border-[#2f2f2f] bg-[#171717]`}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-3 border-b border-[#2f2f2f]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center">
                  <div className="w-3 h-3 bg-[#202123] rounded-sm"></div>
                </div>
                <select 
                  className="bg-transparent text-sm font-medium text-white border-none outline-none cursor-pointer"
                  aria-label="Select model"
                >
                  <option>GPT-5</option>
                  <option>GPT-4</option>
                  <option>GPT-3.5</option>
                </select>
                <ChevronDown size={14} className="text-gray-400" />
              </div>
              <Button variant="ghost" size="sm" className="text-white hover:bg-[#2f2f2f] p-1">
                <Settings size={16} />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-3 space-y-1">
              <Button variant="ghost" className="w-full justify-start text-white hover:bg-[#2f2f2f] h-8 text-sm">
                <Plus size={16} className="mr-2" />
                New chat
              </Button>
              <Button variant="ghost" className="w-full justify-start text-white hover:bg-[#2f2f2f] h-8 text-sm">
                <Search size={16} className="mr-2" />
                Search chats
              </Button>
            </div>
          </div>

          {/* User Profile */}
          <div className="p-3 border-t border-[#2f2f2f]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">U</span>
              </div>
              <div>
                <div className="text-sm font-medium">User</div>
                <div className="text-xs text-gray-400">Workspace</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col main-content ${sidebarOpen ? '' : 'sidebar-closed'}`}>
        {/* Top Bar */}
        <div className="h-12 border-b border-[#2f2f2f] flex items-center justify-between px-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-[#2f2f2f]"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={16} />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs opacity-70">Assistant</span>
            <label className={(useAssistant ? "bg-blue-500" : "bg-gray-400") + " relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer"} title="Toggle assistant">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={useAssistant}
                onChange={(e) => {
                  const next = e.target.checked;
                  setUseAssistant(next);
                  setAssistantId(next ? (assistantIdInput || process.env.NEXT_PUBLIC_ASSISTANT_ID || undefined) : undefined);
                }}
                aria-label="Toggle assistant"
              />
              <span className={(useAssistant ? "translate-x-6" : "translate-x-1") + " pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition-transform"} />
            </label>
            {useAssistant && (
              <Input
                value={assistantIdInput}
                onChange={(e) => {
                  setAssistantIdInput(e.target.value);
                  if (useAssistant) setAssistantId(e.target.value || undefined);
                }}
                placeholder="asst_..."
                className="h-6 w-32 text-xs bg-[#2f2f2f] border-[#404040] text-white"
              />
            )}
          </div>
          <Button variant="ghost" size="sm" className="text-white hover:bg-[#2f2f2f]">
            <User size={16} />
          </Button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center px-4">
              <h1 className="text-2xl font-medium mb-8">What can I help with?</h1>
              <div className="w-full max-w-2xl">
                <form onSubmit={handleSend} className="relative">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                      <Plus size={20} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask anything"
                      className="w-full h-12 pl-10 pr-20 bg-[#2f2f2f] border border-[#404040] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex gap-2">
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-1">
                        <Mic size={16} />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-1">
                        <Volume2 size={16} />
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
              <p className="text-sm text-gray-400 mt-8 text-center">
                ChatGPT can make mistakes. OpenAI doesn&apos;t use your workspace data to train its models.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                {messages.map((m, idx) => (
                  <div key={m.id} className="space-y-2">
                    <Message role={m.role} content={m.content} />
                    {m.role === "assistant" && idx === messages.length - 1 && (
                      <MessageActions text={m.content} onRegenerate={() => setInput(messages[messages.length - 2]?.content ?? "")} />
                    )}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </div>
          )}

          {/* Input Area (when there are messages) */}
          {messages.length > 0 && (
            <div className="border-t border-[#2f2f2f] p-4">
              <div className="max-w-3xl mx-auto">
                <form onSubmit={handleSend} className="relative">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                      <Plus size={20} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask anything"
                      className="w-full h-12 pl-10 pr-20 bg-[#2f2f2f] border border-[#404040] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex gap-2">
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-1">
                        <Mic size={16} />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-1">
                        <Volume2 size={16} />
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
