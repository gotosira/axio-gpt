import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    console.log("Feedback API called with params:", { id });
    
    const session = await getServerSession(authOptions);
    console.log("Session:", { userId: session?.user?.id, hasSession: !!session });
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { feedback } = await request.json();
    console.log("Feedback data:", { feedback, messageId: id });
    
    if (!["like", "dislike", null].includes(feedback)) {
      return NextResponse.json({ error: "Invalid feedback value" }, { status: 400 });
    }

    // Verify the message belongs to the user
    console.log("Looking for message with ID:", id);
    const message = await prisma.message.findFirst({
      where: {
        id,
        conversation: {
          userId: session.user.id
        }
      }
    });

    console.log("Found message:", { found: !!message, messageId: message?.id });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Update the feedback
    console.log("Updating feedback for message:", id, "with feedback:", feedback);
    const updatedMessage = await prisma.message.update({
      where: { id },
      data: { feedback },
      include: {
        conversation: true
      }
    });

    console.log("Successfully updated message feedback");
    return NextResponse.json({ message: updatedMessage });
  } catch (error) {
    console.error("Error updating message feedback:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
