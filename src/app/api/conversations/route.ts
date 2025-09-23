import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const assistantId = searchParams.get("assistantId") || undefined;

    // Build where clause with enhanced filtering
    let whereClause: any = { 
      userId: decoded.userId,
      isArchived: false // Only show non-archived conversations by default
    };
    
    if (assistantId) {
      if (assistantId === 'asst_sS0Sa5rqQFrrwnwkJ9mULGp0') {
        // For Babao, also include legacy conversations with null assistantId
        whereClause = {
          ...whereClause,
          OR: [ { assistantId }, { assistantId: null } ],
        };
      } else {
        whereClause.assistantId = assistantId;
      }
    }

    const conversations = await prisma.conversation.findMany({
      where: whereClause,
      orderBy: [
        { isPinned: "desc" },
        { lastMessageAt: "desc" }
      ],
      include: {
        messages: {
          orderBy: [{ createdAt: "asc" }],
          take: 1, // Only get the first message for preview
        },
        _count: {
          select: { messages: true }
        }
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
    const cookieStore = cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify token
    const decoded = verify(token, process.env.NEXTAUTH_SECRET!) as {
      userId: string;
    };

    const { title, assistantId, settings, tags } = await request.json();

    const conversation = await prisma.conversation.create({
      data: {
        title: title || "New Chat",
        userId: decoded.userId,
        assistantId,
        settings,
        tags: tags || [],
        lastMessageAt: new Date(),
      },
    });

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
