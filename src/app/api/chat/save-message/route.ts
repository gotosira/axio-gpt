import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role, content, conversationId, shouldRename } = await request.json();

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
        },
      });
    } else {
      message = existingMessage;
    }

    // If this is an assistant message and we should rename the conversation
    if (role === "assistant" && shouldRename) {
      // Generate a better title based on the conversation content
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: session.user.id },
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
