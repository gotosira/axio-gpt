import { NextRequest } from "next/server";
import OpenAI from "openai";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as {
      userId: string;
    };

    const body = await req.json();
    const { messages, assistantId: assistantIdFromClient, conversationId } = body as {
      messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
      assistantId?: string;
      conversationId?: string;
    };

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const apiKey = (process.env.APP_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "").trim();
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), { status: 401 });
    }
    const client = new OpenAI({ apiKey });

    // Create or get conversation
    let currentConversationId = conversationId;
    if (!currentConversationId) {
      const newConversation = await prisma.conversation.create({
        data: {
          title: messages.find(m => m.role === "user")?.content?.slice(0, 50) || "New Chat",
          userId: decoded.userId,
          assistantId: assistantIdFromClient,
        },
      });
      currentConversationId = newConversation.id;
    }

    const assistantId = (assistantIdFromClient || process.env.ASSISTANT_ID || "").trim();
    
    if (assistantId) {
      // Use Assistants API
      const thread = await client.beta.threads.create({
        messages: messages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      });

      const run = await client.beta.threads.runs.createAndPoll(thread.id, { 
        assistant_id: assistantId 
      });

      const messages_response = await client.beta.threads.messages.list(thread.id);
      const latest_message = messages_response.data[0];
      const content = latest_message.content[0];
      
      let response_text = "";
      if (content.type === "text") {
        response_text = content.text.value;
      }

      // Save user message
      const userMessage = messages.find(m => m.role === "user");
      if (userMessage) {
        await prisma.message.create({
          data: {
            role: "user",
            content: userMessage.content,
            conversationId: currentConversationId,
          },
        });
      }

      // Save assistant message
      await prisma.message.create({
        data: {
          role: "assistant",
          content: response_text,
          conversationId: currentConversationId,
        },
      });

      return new Response(JSON.stringify({ 
        response: response_text,
        conversationId: currentConversationId 
      }), {
        headers: { "Content-Type": "application/json" },
      });
    } else {
      // Use regular chat completions
      const completion = await client.chat.completions.create({
        model,
        messages: messages.map(m => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        })),
        max_tokens: 2000,
        temperature: 0.7,
      });

      const response_text = completion.choices[0]?.message?.content || "No response";

      // Save user message
      const userMessage = messages.find(m => m.role === "user");
      if (userMessage) {
          await prisma.message.create({
            data: {
              role: "user",
            content: userMessage.content,
              conversationId: currentConversationId,
            },
          });
        }

      // Save assistant message
      await prisma.message.create({
        data: {
          role: "assistant",
          content: response_text,
          conversationId: currentConversationId,
        },
      });

      return new Response(JSON.stringify({ 
        response: response_text,
        conversationId: currentConversationId 
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Internal server error" 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}