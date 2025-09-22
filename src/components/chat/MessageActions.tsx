"use client";
import { Copy, RotateCcw, ThumbsUp, ThumbsDown } from "lucide-react";

export function MessageActions({ text, onRegenerate }: { text: string; onRegenerate?: () => void }) {
  async function copy() {
    try { await navigator.clipboard.writeText(text); } catch {}
  }
  return (
    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button 
        className="p-1.5 rounded-md hover:bg-[#2f2f2f] text-gray-400 hover:text-white transition-colors" 
        onClick={copy} 
        title="Copy"
      >
        <Copy size={14} />
      </button>
      {onRegenerate && (
        <button 
          className="p-1.5 rounded-md hover:bg-[#2f2f2f] text-gray-400 hover:text-white transition-colors" 
          onClick={onRegenerate} 
          title="Regenerate"
        >
          <RotateCcw size={14} />
        </button>
      )}
      <button 
        className="p-1.5 rounded-md hover:bg-[#2f2f2f] text-gray-400 hover:text-white transition-colors" 
        title="Good response"
      >
        <ThumbsUp size={14} />
      </button>
      <button 
        className="p-1.5 rounded-md hover:bg-[#2f2f2f] text-gray-400 hover:text-white transition-colors" 
        title="Bad response"
      >
        <ThumbsDown size={14} />
      </button>
    </div>
  );
}


