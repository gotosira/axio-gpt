import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.APP_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as unknown as Record<string, unknown>)) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await request.json();

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversation ID" }, { status: 400 });
    }

    // Get the conversation with messages
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: session.user.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Get the first few messages to generate a title
    const firstMessages = conversation.messages.slice(0, 4);
    const conversationText = firstMessages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    // Generate a title using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Generate a short, descriptive title (max 50 characters) for this conversation. The title should capture the main topic or question being discussed. Return only the title, no quotes or extra text."
        },
        {
          role: "user",
          content: conversationText
        }
      ],
      max_tokens: 20,
      temperature: 0.7,
    });

    const generatedTitle = completion.choices[0]?.message?.content?.trim() || "New Chat";

    // Update the conversation title
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { title: generatedTitle },
    });

    return NextResponse.json({ title: generatedTitle });
  } catch (error) {
    console.error("Error generating title:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
