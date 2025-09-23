import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
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
