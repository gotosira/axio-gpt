import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // For now, return some default suggestions
    // In the future, this could be enhanced to fetch from the assistant API
    const suggestions = [
      {
        id: "1",
        title: "Help me write",
        description: "Write a professional email",
        action: "Write a professional email to my manager about the project update"
      },
      {
        id: "2", 
        title: "Explain concepts",
        description: "Explain complex topics simply",
        action: "Explain quantum computing in simple terms"
      },
      {
        id: "3",
        title: "Code assistance",
        description: "Help with programming",
        action: "Help me debug this JavaScript function"
      }
    ];

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
