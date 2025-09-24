import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.APP_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify token
    const decoded = verify(token, process.env.NEXTAUTH_SECRET!) as {
      userId: string;
    };

    const { conversationId } = await request.json();

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversation ID" }, { status: 400 });
    }

    // Get the conversation with messages
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: decoded.userId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Get the first few messages to generate a title
    const firstMessages = conversation.messages.slice(0, 6);
    const conversationText = firstMessages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    // Generate a title using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Generate a short, descriptive, user-friendly title (max 50 characters) based on the following conversation messages. Use sentence case, remove emojis and markdown, and return only the title (no quotes)."
        },
        {
          role: "user",
          content: conversationText
        }
      ],
      max_tokens: 32,
      temperature: 0.7,
    });

    // Post-process: sanitize and prefix with assistant name when available
    let generatedTitle = completion.choices[0]?.message?.content?.trim() || "New Chat";
    // Remove wrapping quotes if present
    if ((generatedTitle.startsWith('"') && generatedTitle.endsWith('"')) || (generatedTitle.startsWith("'") && generatedTitle.endsWith("'"))) {
      generatedTitle = generatedTitle.slice(1, -1);
    }

    // Map assistantId to human-friendly name
    const assistantNameMap: Record<string, string> = {
      'asst_sS0Sa5rqQFrrwnwkJ9mULGp0': 'BaoBao',
      'asst_CO7qtWO5QTfgV0Gyv77XQY8q': 'DeeDee',
      'asst_Pi6FrBRHRpvhwSOIryJvDo3T': 'PungPung',
      'asst_4nCaYlt7AA5Ro4pseDCTbKHO': 'FlowFlow',
      'group': 'Group'
    };

    const assistantPrefix = conversation.assistantId ? (assistantNameMap[conversation.assistantId] || conversation.assistantId) : undefined;
    let finalTitle = assistantPrefix ? `${assistantPrefix}: ${generatedTitle}` : generatedTitle;
    // Enforce 50-char max (approx) including prefix
    if (finalTitle.length > 50) {
      finalTitle = finalTitle.slice(0, 50).replace(/\s+\S*$/, '').trim();
      if (!finalTitle.endsWith('…')) finalTitle = `${finalTitle}…`;
    }

    // Update the conversation title
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { title: finalTitle },
    });

    return NextResponse.json({ title: finalTitle });
  } catch (error) {
    console.error("Error generating title:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
