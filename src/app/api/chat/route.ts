import { NextRequest } from "next/server";
import OpenAI from "openai";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getToken } from "next-auth/jwt";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const body = await req.json();
    const { messages, previousResponseId, model: modelFromClient, instructions: instructionsFromClient, assistantId: assistantIdFromClient, conversationId, attachments } = body as {
      messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
      previousResponseId?: string;
      model?: string;
      instructions?: string;
      assistantId?: string;
      conversationId?: string;
      attachments?: Array<{
        name: string;
        type?: string;
        text?: string;
        driveId?: string;
      }>;
    };

    const model = modelFromClient || process.env.OPENAI_MODEL || "gpt-4.1-mini";
    const apiKey = (process.env.APP_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "").trim();
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), { status: 401 });
    }
    const client = new OpenAI({ apiKey });

    // Process messages to handle file attachments
    const processedMessages = messages.map(msg => {
      if (msg.role === "user" && msg.content.includes("📎 ไฟล์แนบ:")) {
        // Add context about file attachments
        const fileInfo = msg.content.match(/📎 ไฟล์แนบ:.*$/m)?.[0] || "";
        return {
          ...msg,
          content: msg.content.replace(/\n\n📎 ไฟล์แนบ:.*$/s, '') + 
            (fileInfo ? `\n\nหมายเหตุ: ผู้ใช้ได้แนบไฟล์ ${fileInfo.replace('📎 ไฟล์แนบ: ', '')} มาด้วย กรุณาตอบคำถามโดยคำนึงถึงไฟล์ที่แนบมาด้วย` : '')
        };
      }
      return msg;
    });

    // If client supplied attachments, attempt server-side extraction (Drive + PDFs, etc.)
    let extractedAttachmentText = "";
    if (attachments && attachments.length > 0) {
      // Attempt to get server-side Google access token (from NextAuth JWT)
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let accessToken = (token as any)?.accessToken as string | undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accessTokenExpires = (token as any)?.accessTokenExpires as number | undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const refreshToken = (token as any)?.refreshToken as string | undefined;
      const refreshIfNeeded = async () => {
        const isExpired = !accessToken || (accessTokenExpires && Date.now() >= accessTokenExpires);
        if (isExpired && refreshToken) {
          try {
            const params = new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID as string,
              client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
              grant_type: "refresh_token",
              refresh_token: refreshToken,
            });
            const resp = await fetch("https://oauth2.googleapis.com/token", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: params.toString(),
            });
            if (resp.ok) {
              const data = await resp.json();
              accessToken = data.access_token || accessToken;
            }
          } catch {}
        }
      };

      const toText = async (contentType: string | undefined, bytes: ArrayBuffer): Promise<string | null> => {
        if (!contentType) return null;
        const mime = contentType.toLowerCase();
        try {
          if (mime.startsWith("text/") || mime.includes("json") || mime.includes("csv") || mime.includes("xml") || mime.includes("markdown") || mime.includes("html")) {
            return new TextDecoder().decode(new Uint8Array(bytes));
          }
          if (mime.includes("pdf")) {
            try {
              // Dynamic import to avoid hard dependency
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const mod: any = await import(/* webpackIgnore: true */ 'pdf-parse').catch(() => null);
              if (mod && mod.default) {
                // Convert to Buffer for pdf-parse
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const nodeBuf: any = Buffer.from(bytes);
                const out = await mod.default(nodeBuf);
                if (out?.text) return out.text as string;
              }
            } catch {}
          }
          if (mime.includes('spreadsheetml.sheet') || mime === 'application/vnd.ms-excel') {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const xlsx: any = await import(/* webpackIgnore: true */ 'xlsx').catch(() => null);
              if (xlsx) {
                const wb = xlsx.read(new Uint8Array(bytes), { type: 'array' });
                const sheetName = wb.SheetNames[0];
                const sheet = wb.Sheets[sheetName];
                const csv = xlsx.utils.sheet_to_csv(sheet);
                return csv as string;
              }
            } catch {}
          }
        } catch {}
        return null;
      };

      for (const a of attachments) {
        try {
          if (a.text && a.text.trim()) {
            extractedAttachmentText += `\n\n[Attachment: ${a.name}]\n${a.text.trim()}`;
            continue;
          }
          if (a.driveId) {
            await refreshIfNeeded();
            if (!accessToken) continue;
            const metaResp = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(a.driveId)}?fields=name,mimeType,size,webViewLink`, { headers: { Authorization: `Bearer ${accessToken}` } });
            const meta = metaResp.ok ? await metaResp.json() as { name?: string; mimeType?: string; webViewLink?: string } : {};

            let contentArrayBuffer: ArrayBuffer | null = null;
            let contentType: string | undefined = meta.mimeType;
            if (meta.mimeType?.startsWith('application/vnd.google-apps')) {
              // Use export API for Google Workspace files
              let exportMime = 'text/plain';
              if (meta.mimeType === 'application/vnd.google-apps.spreadsheet') exportMime = 'text/csv';
              const exportResp = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(a.driveId)}/export?mimeType=${encodeURIComponent(exportMime)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
              if (exportResp.ok) {
                contentArrayBuffer = await exportResp.arrayBuffer();
                contentType = exportMime;
              }
            } else {
              const mediaResp = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(a.driveId)}?alt=media`, { headers: { Authorization: `Bearer ${accessToken}` } });
              if (mediaResp.ok) contentArrayBuffer = await mediaResp.arrayBuffer();
            }

            if (contentArrayBuffer) {
              const text = await toText(contentType, contentArrayBuffer);
              if (text) {
                extractedAttachmentText += `\n\n[Attachment: ${meta.name || a.name}]\n${text}`;
              } else {
                extractedAttachmentText += `\n\n[Attachment: ${meta.name || a.name}]\nThe file is of type ${meta.mimeType || a.type || 'unknown'}. A direct content extraction is not available; use the link: ${meta.webViewLink || ''}.`;
              }
            }
          }
        } catch {}
      }
    }

    const assistantId = (assistantIdFromClient || process.env.ASSISTANT_ID || "").trim();
    if (assistantId) {
      // Use Assistants API streaming
      const thread = await client.beta.threads.create({
        messages: processedMessages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      });

      const run = await client.beta.threads.runs.stream(thread.id, { assistant_id: assistantId });

      const encoder = new TextEncoder();
      let isClosed = false;
      const readable = new ReadableStream<Uint8Array>({
        start(controller) {
          const closeOnce = () => {
            if (isClosed) return;
            isClosed = true;
            try { controller.close(); } catch {}
          };
          run.on("textDelta", (delta) => {
            controller.enqueue(encoder.encode(delta.value));
          });
          run.on("end", closeOnce);
          run.on("error", closeOnce);
        },
        cancel() {
          try { run.abort(); } catch {}
        },
      });

      const headers = new Headers();
      headers.set("Content-Type", "text/plain; charset=utf-8");
      headers.set("Cache-Control", "no-cache");
      headers.set("X-Assistant-Id", assistantId);
      return new Response(readable, { headers });
    }

    const systemParts = processedMessages.filter((m) => m.role === "system").map((m) => m.content);
    const baseInstructions = instructionsFromClient ?? process.env.OPENAI_INSTRUCTIONS ?? "";
    const instructions = [baseInstructions, ...systemParts].filter(Boolean).join("\n\n");
    const latestUserMessageBase = [...processedMessages].reverse().find((m) => m.role === "user")?.content ?? "";
    const latestUserMessage = extractedAttachmentText ? `${latestUserMessageBase}\n\n[Extracted Attachments]\n${extractedAttachmentText}` : latestUserMessageBase;

    const stream = await client.responses.stream({
      model,
      input: latestUserMessage,
      ...(instructions ? { instructions } : {}),
      ...(previousResponseId ? { previous_response_id: previousResponseId } : {}),
      store: true,
      // Encourage complete answers and reduce truncation/hesitation
      max_output_tokens: Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 2048),
      temperature: Number(process.env.OPENAI_TEMPERATURE || 0.3),
    });

    let responseId: string | undefined = undefined;
    await new Promise<void>((resolve) => {
      stream.on("response.created", (event: unknown) => {
        const e = event as { response?: { id?: string } };
        responseId = e.response?.id;
        resolve();
      });
      stream.on("error", () => resolve());
      setTimeout(resolve, 200);
    });

    const encoder = new TextEncoder();
    let isClosed = false;
    const readable = new ReadableStream<Uint8Array>({
      start(controller) {
        const closeOnce = () => {
          if (isClosed) return;
          isClosed = true;
          try {
            controller.close();
          } catch {}
        };

        stream.on("response.output_text.delta", (event: unknown) => {
          const e = event as { delta?: string };
          if (typeof e?.delta === "string") controller.enqueue(encoder.encode(e.delta));
        });
        stream.on("end", closeOnce);
        stream.on("error", closeOnce);
      },
      cancel() {
        try {
          stream.abort();
        } catch {}
      },
    });

    // Save messages to database
    let currentConversationId = conversationId;
    if (!currentConversationId) {
      const newConversation = await prisma.conversation.create({
        data: {
          title: processedMessages.find(m => m.role === "user")?.content?.slice(0, 50) || "New Chat",
          userId: session.user.id,
          assistantId: assistantIdFromClient,
        },
      });
      currentConversationId = newConversation.id;
    }

    // Save all user messages that haven't been saved yet
    const existingMessages = await prisma.message.findMany({
      where: { conversationId: currentConversationId },
      select: { content: true, role: true },
    });

    for (const message of processedMessages) {
      if (message.role === "user") {
        // Check if this user message already exists
        const exists = existingMessages.some(
          (existing) => existing.content === message.content && existing.role === "user"
        );
        
        if (!exists) {
          await prisma.message.create({
            data: {
              role: "user",
              content: message.content,
              conversationId: currentConversationId,
            },
          });
        }
      }
    }

    // Store conversation ID and response ID for assistant message saving
    const responseData = {
      conversationId: currentConversationId,
      responseId: responseId,
    };

    const headers = new Headers();
    headers.set("Content-Type", "text/plain; charset=utf-8");
    headers.set("Cache-Control", "no-cache");
    if (responseId) headers.set("X-Response-Id", responseId);
    headers.set("X-Conversation-Id", currentConversationId);
    headers.set("X-Response-Data", JSON.stringify(responseData));
    return new Response(readable, { headers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}


