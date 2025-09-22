import * as React from "react";

export function ScrollArea({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={"relative overflow-hidden " + (className ?? "")}>
      <div className="h-full w-full overflow-y-auto pr-1">{children}</div>
    </div>
  );
}


