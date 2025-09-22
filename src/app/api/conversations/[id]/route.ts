import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as unknown as Record<string, unknown>)) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId: session.user.id,
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
    const session = (await getServerSession(authOptions as unknown as Record<string, unknown>)) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { title } = await request.json();

    // Use updateMany to safely scope by userId (update requires unique selector)
    const result = await prisma.conversation.updateMany({
      where: { id, userId: session.user.id },
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
    const session = (await getServerSession(authOptions as unknown as Record<string, unknown>)) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.conversation.delete({
      where: {
        id,
        userId: session.user.id,
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
