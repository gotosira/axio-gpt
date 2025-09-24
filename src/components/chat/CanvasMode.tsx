"use client";
import React, { useEffect, useRef } from "react";

type CanvasModeProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  contentMarkdown?: string; // raw markdown for export/share
  onSave?: (html: string) => void;
};

export default function CanvasMode({
  isOpen,
  onClose,
  title,
  children,
  isFullScreen = false,
  onToggleFullScreen,
  contentMarkdown,
  onSave,
}: CanvasModeProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const docRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  return (
    <div className={`fixed inset-0 z-50 pointer-events-none`}>
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`absolute top-0 right-0 h-full bg-white border-l pointer-events-auto transition-[transform,width] duration-300 shadow-2xl overflow-hidden flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } ${isFullScreen ? 'w-full' : 'w-[70%]'} max-w-[100vw]`}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Canvas mode'}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-medium truncate">{title || 'Canvas'}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Export / Share tools */}
            <button
              onClick={async () => {
                try {
                  const doc = panelRef.current?.querySelector('.canvas-doc') as HTMLElement | null;
                  const text = contentMarkdown || (doc?.innerText || '');
                  await navigator.clipboard.writeText(text);
                } catch {}
              }}
              className="h-8 px-2 text-sm rounded-md border hover:bg-accent"
              aria-label="Copy content"
              title="Copy"
            >
              Copy
            </button>
            <button
              onClick={async () => {
                const doc = panelRef.current?.querySelector('.canvas-doc') as HTMLElement | null;
                const text = contentMarkdown || (doc?.innerText || '');
                const shareData: ShareData = {
                  title: title || 'Canvas',
                  text,
                };
                // Prefer Web Share API; fallback to copy
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const navAny = navigator as any;
                if (navAny && typeof navAny.share === 'function') {
                  try { await navAny.share(shareData); } catch {}
                } else {
                  try { await navigator.clipboard.writeText(text); } catch {}
                }
              }}
              className="h-8 px-2 text-sm rounded-md border hover:bg-accent"
              aria-label="Share content"
              title="Share"
            >
              Share
            </button>
            <div className="relative group">
              <button
                className="h-8 px-2 text-sm rounded-md border hover:bg-accent"
                aria-haspopup="menu"
                aria-expanded="false"
                title="Download"
              >
                Download ▾
              </button>
              <div className="absolute right-0 mt-1 w-56 rounded-md border bg-background shadow-xl hidden group-hover:block">
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent/30"
                  onClick={() => {
                    const doc = panelRef.current?.querySelector('.canvas-doc') as HTMLElement | null;
                    const blob = new Blob([contentMarkdown || (doc?.innerText || '')], { type: 'text/markdown;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${(title || 'canvas').toLowerCase().replace(/\s+/g, '-')}.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Markdown (.md)
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent/30"
                  onClick={() => {
                    const safeTitle = title || 'Canvas';
                    const doc = panelRef.current?.querySelector('.canvas-doc') as HTMLElement | null;
                    const htmlContent = doc ? doc.outerHTML : `<pre>${(contentMarkdown || '').replace(/</g,'&lt;')}</pre>`;
                    const html = `<!doctype html><html><head><meta charset=\"utf-8\"/><title>${safeTitle}</title><style>body{font-family:'IBM Plex Sans Thai',system-ui;-webkit-font-smoothing:antialiased;margin:24px;background:#ffffff} .canvas-doc{max-width:900px;margin:0 auto;}</style></head><body>${htmlContent}</body></html>`;
                    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${(safeTitle || 'canvas').toLowerCase().replace(/\s+/g, '-')}.html`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  HTML (.html)
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent/30"
                  onClick={() => {
                    // Print dialog (user can choose Save as PDF)
                    const safeTitle = title || 'Canvas';
                    const win = window.open('', '_blank');
                    if (!win) return;
                    const content = (panelRef.current?.querySelector('.canvas-content') as HTMLElement | null)?.innerHTML || '';
                    win.document.write(`<!doctype html><html><head><meta charset=\"utf-8\"/><title>${safeTitle}</title></head><body>${content}</body></html>`);
                    win.document.close();
                    win.focus();
                    setTimeout(() => { try { win.print(); } catch {} }, 300);
                  }}
                >
                  Print / Save as PDF
                </button>
              </div>
            </div>
            {onToggleFullScreen && (
              <button
                onClick={onToggleFullScreen}
                className="h-8 px-2 text-sm rounded-md border hover:bg-accent"
                aria-label={isFullScreen ? 'Exit full screen' : 'Enter full screen'}
                title={isFullScreen ? 'Exit full screen' : 'Enter full screen'}
              >
                {isFullScreen ? 'Windowed' : 'Full screen'}
              </button>
            )}
            <button
              onClick={onClose}
              className="h-8 px-2 text-sm rounded-md border hover:bg-accent"
              aria-label="Close canvas"
              title="Close"
            >
              Close
            </button>
          </div>
        </div>

        {/* Formatting toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b bg-white">
          <button className="h-8 px-2 text-sm rounded-md border" title="Bold" onClick={() => { docRef.current?.focus(); document.execCommand('bold'); }}>B</button>
          <button className="h-8 px-2 text-sm rounded-md border" title="Italic" onClick={() => { docRef.current?.focus(); document.execCommand('italic'); }}><i>I</i></button>
          <button className="h-8 px-2 text-sm rounded-md border" title="Heading 1" onClick={() => { docRef.current?.focus(); document.execCommand('formatBlock', false, 'h1'); }}>H1</button>
          <button className="h-8 px-2 text-sm rounded-md border" title="Heading 2" onClick={() => { docRef.current?.focus(); document.execCommand('formatBlock', false, 'h2'); }}>H2</button>
          <button className="h-8 px-2 text-sm rounded-md border" title="Bulleted list" onClick={() => { docRef.current?.focus(); document.execCommand('insertUnorderedList'); }}>• List</button>
          <button className="h-8 px-2 text-sm rounded-md border" title="Numbered list" onClick={() => { docRef.current?.focus(); document.execCommand('insertOrderedList'); }}>1. List</button>
          <button className="h-8 px-2 text-sm rounded-md border" title="Align left" onClick={() => { docRef.current?.focus(); document.execCommand('justifyLeft'); }}>⟸</button>
          <button className="h-8 px-2 text-sm rounded-md border" title="Align center" onClick={() => { docRef.current?.focus(); document.execCommand('justifyCenter'); }}>≡</button>
          <button className="h-8 px-2 text-sm rounded-md border" title="Quote" onClick={() => { docRef.current?.focus(); document.execCommand('formatBlock', false, 'blockquote'); }}>❝ ❞</button>
          <button className="h-8 px-2 text-sm rounded-md border" title="Insert table" onClick={() => {
            docRef.current?.focus();
            const table = `<table style=\"width:100%;border-collapse:collapse;margin:8px 0\"><thead><tr><th style=\"border:1px solid #e5e7eb;padding:8px;text-align:left\">Column 1</th><th style=\"border:1px solid #e5e7eb;padding:8px;text-align:left\">Column 2</th></tr></thead><tbody><tr><td style=\"border:1px solid #e5e7eb;padding:8px\">Cell</td><td style=\"border:1px solid #e5e7eb;padding:8px\">Cell</td></tr></tbody></table>`;
            document.execCommand('insertHTML', false, table);
          }}>Table</button>
          {onSave && (
            <button className="ml-auto h-8 px-3 text-sm rounded-md border bg-blue-600 text-white hover:bg-blue-700" title="Save to conversation" onClick={() => {
              const html = (docRef.current?.innerHTML || '').trim();
              onSave(html);
            }}>Save</button>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4 canvas-content bg-white">
          <div
            className="canvas-doc chatgpt-msg"
            contentEditable
            suppressContentEditableWarning
            style={{
              maxWidth: 900,
              margin: '0 auto',
              lineHeight: 1.7,
              padding: '16px 8px 40px',
            }}
            ref={docRef}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}


