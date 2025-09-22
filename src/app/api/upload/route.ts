import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    console.log('Uploading file to OpenAI:', file.name, file.size, 'bytes');

    // Upload file to OpenAI
    const openaiFormData = new FormData();
    // Use 'assistants' purpose for all files to work with Assistants API
    openaiFormData.append("purpose", "assistants"); 
    openaiFormData.append("file", new Blob([await file.arrayBuffer()], { type: file.type }), file.name);

    const openaiResponse = await fetch("https://api.openai.com/v1/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: openaiFormData,
    });

    const openaiData = await openaiResponse.json();
    console.log('OpenAI upload response:', { status: openaiResponse.status, data: openaiData });

    if (!openaiResponse.ok) {
      return NextResponse.json({ 
        error: openaiData?.error?.message || "Failed to upload to OpenAI" 
      }, { status: openaiResponse.status });
    }

    // Return file info with OpenAI file ID
    const fileInfo = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      fileId: openaiData.id, // This is the key addition!
    };

    console.log('File uploaded successfully, fileId:', openaiData.id);
    return NextResponse.json({ file: fileInfo });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
