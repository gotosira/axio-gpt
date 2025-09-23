import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId: decoded.userId,
      },
      include: {
        messages: {
          orderBy: [{ createdAt: "asc" }],
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Error fetching conversation:", error);
    const isDev = process.env.NODE_ENV !== "production";
    const body = isDev
      ? { error: "Internal server error", message: (error as Error)?.message, stack: (error as Error)?.stack }
      : { error: "Internal server error" };
    return NextResponse.json(body, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const { title } = await request.json();

    // Use updateMany to safely scope by userId (update requires unique selector)
    const result = await prisma.conversation.updateMany({
      where: { id, userId: decoded.userId },
      data: { title },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const updated = await prisma.conversation.findUnique({ where: { id } });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating conversation:", error);
    const isDev = process.env.NODE_ENV !== "production";
    const body = isDev
      ? { error: "Internal server error", message: (error as Error)?.message, stack: (error as Error)?.stack }
      : { error: "Internal server error" };
    return NextResponse.json(body, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    
    // First verify the conversation belongs to the user
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId: decoded.userId,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Delete the conversation (this will cascade delete messages due to onDelete: Cascade)
    await prisma.conversation.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    const isDev = process.env.NODE_ENV !== "production";
    const body = isDev
      ? { error: "Internal server error", message: (error as Error)?.message, stack: (error as Error)?.stack }
      : { error: "Internal server error" };
    return NextResponse.json(body, { status: 500 });
  }
}
