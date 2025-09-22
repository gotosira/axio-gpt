import * as React from "react";
import TextareaAutosize from "react-textarea-autosize";
import { twMerge } from "tailwind-merge";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <TextareaAutosize
      ref={ref as React.Ref<HTMLTextAreaElement>}
      className={twMerge(
        "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
        "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      minRows={2}
      maxRows={10}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
