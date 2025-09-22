import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const assistantId = searchParams.get("assistantId") || undefined;

    let whereClause: Parameters<typeof prisma.conversation.findMany>[0]["where"] = { userId: session.user.id };
    if (assistantId) {
      if (assistantId === 'asst_sS0Sa5rqQFrrwnwkJ9mULGp0') {
        // For Babao, also include legacy conversations with null assistantId
        whereClause = {
          AND: [
            { userId: session.user.id },
            { OR: [ { assistantId }, { assistantId: null } ] },
          ],
        };
      } else {
        whereClause = { userId: session.user.id, assistantId };
      }
    }

    const conversations = await prisma.conversation.findMany({
      where: whereClause,
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: [{ createdAt: "asc" }],
        },
      },
    });

    return NextResponse.json(conversations);
  } catch (error) {
    // Log full error for the server console
    console.error("Error fetching conversations:", error);
    // Return a more helpful error body in development to aid debugging
    const isDev = process.env.NODE_ENV !== "production";
    const message = (error as Error)?.message || "Unknown error";
    const body = isDev ? { error: "Internal server error", message } : { error: "Internal server error" };
    return NextResponse.json(body, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, assistantId } = await request.json();

    const conversation = await prisma.conversation.create({
      data: {
        title: title || "New Chat",
        userId: session.user.id,
        assistantId,
      },
    });

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
