"use client";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

const MODELS = ["gpt-5", "gpt-4.1", "gpt-4.1-mini"];

export function TopBar({ onChange }: { onChange: (v: { model: string; instructions: string }) => void }) {
  const [model, setModel] = useState<string>(MODELS[0]);
  const [instructions, setInstructions] = useState<string>("");
  const [theme, setTheme] = useState<string>(() => localStorage.getItem("theme") || "dark");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    onChange({ model, instructions });
  }, [model, instructions, onChange]);

  return (
    <div className="flex w-full items-center gap-3">
      <select
        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        value={model}
        onChange={(e) => setModel(e.target.value)}
        aria-label="Model"
      >
        {MODELS.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <input
        className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
        placeholder="System prompt (optional)"
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
      />
      <button
        className="h-9 w-9 inline-flex items-center justify-center rounded-md border"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        title="Toggle theme"
      >
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </div>
  );
}
