"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { ThumbsUp, ThumbsDown, Reply, RotateCcw, Trash2, Copy } from "lucide-react";

interface ContextMenuProps {
  x: number;
  y: number;
  messageId: string;
  messageRole: "user" | "assistant";
  onClose: () => void;
  onFeedback: (messageId: string, feedback: "like" | "dislike" | null) => void;
  onReply: (messageId: string) => void;
  onRegenerate: (messageId: string) => void;
  onDelete: (messageId: string) => void;
  onCopy: (content: string) => void;
  currentFeedback?: "like" | "dislike" | null;
}

export function ContextMenu({
  x,
  y,
  messageId,
  messageRole,
  onClose,
  onFeedback,
  onReply,
  onRegenerate,
  onDelete,
  onCopy,
  currentFeedback
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ left: number; top: number }>({ left: x, top: y });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  useLayoutEffect(() => {
    // Add a small offset so the cursor doesn't cover the menu
    const OFFSET_X = 8;
    const OFFSET_Y = 8;

    const width = menuRef.current?.offsetWidth ?? 220;
    const height = menuRef.current?.offsetHeight ?? 260;
    const maxLeft = (typeof window !== 'undefined' ? window.innerWidth : width) - width - 8;
    const maxTop = (typeof window !== 'undefined' ? window.innerHeight : height) - height - 8;

    const nextLeft = Math.max(8, Math.min(x + OFFSET_X, maxLeft));
    const nextTop = Math.max(8, Math.min(y + OFFSET_Y, maxTop));
    setCoords({ left: nextLeft, top: nextTop });
  }, [x, y]);

  const menuItems = [
    {
      icon: Copy,
      label: "คัดลอก",
      onClick: () => onCopy(messageId),
      show: true
    },
    {
      icon: Reply,
      label: "ตอบกลับ",
      onClick: () => onReply(messageId),
      show: true
    },
    {
      icon: ThumbsUp,
      label: currentFeedback === "like" ? "ยกเลิกถูกใจ" : "ถูกใจ",
      onClick: () => onFeedback(messageId, currentFeedback === "like" ? null : "like"),
      show: true,
      active: currentFeedback === "like"
    },
    {
      icon: ThumbsDown,
      label: currentFeedback === "dislike" ? "ยกเลิกไม่ถูกใจ" : "ไม่ถูกใจ",
      onClick: () => onFeedback(messageId, currentFeedback === "dislike" ? null : "dislike"),
      show: true,
      active: currentFeedback === "dislike"
    },
    {
      icon: RotateCcw,
      label: "สร้างใหม่",
      onClick: () => onRegenerate(messageId),
      show: messageRole === "assistant"
    },
    {
      icon: Trash2,
      label: "ลบ",
      onClick: () => onDelete(messageId),
      show: true,
      danger: true
    }
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]"
      data-left={coords.left}
      data-top={coords.top}
      style={{ 
        left: coords.left, 
        top: coords.top,
        background: '#ffffff',
        border: '1px solid #E4E7EC',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(16, 24, 40, 0.12)',
        zIndex: 9999
      }}
    >
      {menuItems.filter(item => item.show).map((item, index) => {
        const Icon = item.icon;
        return (
          <button
            key={index}
            onClick={item.onClick}
            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 ${
              item.active ? "bg-blue-50 text-blue-600" : ""
            } ${item.danger ? "text-red-600 hover:bg-red-50" : "text-gray-700"} ${
              item.label.includes("ถูกใจ") && item.active ? "bg-green-50 text-green-600" : ""
            } ${
              item.label.includes("ไม่ถูกใจ") && item.active ? "bg-red-50 text-red-600" : ""
            }`}
            style={{
              width: '100%',
              padding: '8px 12px',
              textAlign: 'left',
              background: 'transparent',
              border: 'none',
              color: item.danger ? '#D92D20' : '#344054',
              fontSize: '14px',
              lineHeight: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background-color 0.2s ease'
            }}
          >
            <Icon size={16} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
