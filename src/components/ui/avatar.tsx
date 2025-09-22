export function Avatar({ fallback, role }: { fallback: string; role: "user" | "assistant" }) {
  return (
    <div className={(role === "user" ? "bg-black text-white" : "bg-gray-200 text-gray-900") + " h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium"}>
      {fallback}
    </div>
  );
}


