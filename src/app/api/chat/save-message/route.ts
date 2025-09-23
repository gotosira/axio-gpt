import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify token
    const decoded = verify(token, process.env.NEXTAUTH_SECRET!) as {
      userId: string;
    };

    const { 
      role, 
      content, 
      conversationId, 
      shouldRename, 
      attachments, 
      metadata, 
      tokens 
    } = await request.json();

    if (!role || !content || !conversationId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if message already exists to prevent duplicates
    const existingMessage = await prisma.message.findFirst({
      where: {
        role,
        content,
        conversationId,
      },
    });

    let message;
    if (!existingMessage) {
      // Save the message only if it doesn't exist
      message = await prisma.message.create({
        data: {
          role,
          content,
          conversationId,
          attachments,
          metadata,
          tokens,
        },
      });

      // Update conversation message count and last message time
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          messageCount: { increment: 1 },
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } else {
      message = existingMessage;
    }

    // If this is an assistant message and we should rename the conversation
    if (role === "assistant" && shouldRename) {
      // Generate a better title based on the conversation content
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: decoded.userId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });

      if (conversation) {
        // Get the first user message to use as title
        const firstUserMessage = conversation.messages.find(m => m.role === "user");
        if (firstUserMessage) {
          const newTitle = firstUserMessage.content.slice(0, 50) + 
            (firstUserMessage.content.length > 50 ? "..." : "");
          
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { title: newTitle },
          });
        }
      }
    }

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("Error saving message:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
