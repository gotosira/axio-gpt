"use client";
import { useEffect, useState } from "react";

type Conv = { id: string; title: string };

export function Sidebar({ onNew, onSelect, currentId }: { onNew: () => void; onSelect: (id: string) => void; currentId?: string }) {
  const [list, setList] = useState<Conv[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("conversations");
      setList(raw ? JSON.parse(raw) : []);
    } catch {}
  }, []);

  return (
    <aside className="hidden md:flex w-72 shrink-0 flex-col gap-3 border-r p-3">
      <div className="text-xs uppercase tracking-wide opacity-60">Conversations</div>
      <button onClick={onNew} className="text-left rounded-md border px-3 py-2 text-sm hover:bg-gray-50">New chat</button>
      <div className="flex-1 overflow-auto flex flex-col gap-1">
        {list.length === 0 && <div className="text-xs opacity-60">No conversations</div>}
        {list.map((c) => (
          <button key={c.id} onClick={() => onSelect(c.id)} className={(currentId === c.id ? "bg-gray-100 " : "") + "text-left rounded-md px-3 py-2 text-sm hover:bg-gray-50"}>
            {c.title}
          </button>
        ))}
      </div>
    </aside>
  );
}


