import { NextRequest, NextResponse } from "next/server";

// Uploads a user-selected file to OpenAI Files API and returns its file_id
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const formDataIn = await req.formData();
    const file = formDataIn.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fd = new FormData();
    // OpenAI requires a purpose — use "assistants"
    fd.append("purpose", "assistants");
    fd.append("file", new Blob([await file.arrayBuffer()], { type: file.type || "application/octet-stream" }), file.name);

    const resp = await fetch("https://api.openai.com/v1/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: fd as any,
    });

    const data = await resp.json();
    if (!resp.ok) {
      return NextResponse.json({ error: data?.error?.message || "Upload failed" }, { status: resp.status });
    }

    // Return file id and echo metadata
    return NextResponse.json({ fileId: data.id, name: file.name, size: file.size, type: file.type });
  } catch (err) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}


