import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import OpenAI from "openai";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the message to regenerate
    const message = await prisma.message.findFirst({
      where: {
        id,
        conversation: {
          userId: session.user.id
        }
      },
      include: {
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: 'asc' }
            }
          }
        }
      }
    });

    if (!message || message.role !== "assistant") {
      return NextResponse.json({ error: "Message not found or not an assistant message" }, { status: 404 });
    }

    // Get the conversation context up to this message
    const conversationMessages = message.conversation.messages
      .filter(m => m.createdAt <= message.createdAt && m.id !== message.id)
      .map(m => ({ role: m.role, content: m.content }));

    // Initialize OpenAI client
    const apiKey = (process.env.APP_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "").trim();
    if (!apiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 401 });
    }
    const client = new OpenAI({ apiKey });

    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
    const instructions = process.env.OPENAI_INSTRUCTIONS || "";

    // Generate new response
    const stream = await client.responses.stream({
      model,
      input: conversationMessages[conversationMessages.length - 1]?.content || "",
      ...(instructions ? { instructions } : {}),
      store: true,
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

    // Update the message content with the new response
    let newContent = "";
    const reader = readable.getReader();
    const decoder = new TextDecoder();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        newContent += chunk;
      }
    } finally {
      reader.releaseLock();
    }

    // Update the message in the database
    await prisma.message.update({
      where: { id },
      data: { content: newContent }
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Response-Id": responseId || "",
      },
    });
  } catch (error) {
    console.error("Error regenerating message:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
