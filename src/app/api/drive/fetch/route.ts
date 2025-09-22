import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getToken } from "next-auth/jwt";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { fileId } = (await req.json()) as { fileId?: string };
    if (!fileId) {
      return new Response(JSON.stringify({ error: "Missing fileId" }), { status: 400 });
    }

    // Get JWT to access refresh token and current access token
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let accessToken = (token as any)?.accessToken as string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accessTokenExpires = (token as any)?.accessTokenExpires as number | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refreshToken = (token as any)?.refreshToken as string | undefined;

    // Refresh if expired or missing
    const isExpired = !accessToken || (accessTokenExpires && Date.now() >= accessTokenExpires);
    if (isExpired && refreshToken) {
      try {
        const params = new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID as string,
          client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        });
        const resp = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
        });
        if (resp.ok) {
          const data = await resp.json();
          accessToken = data.access_token || accessToken;
        }
      } catch {}
    }

    if (!accessToken) {
      return new Response(JSON.stringify({ error: "No Google access token" }), { status: 401 });
    }

    // Fetch metadata first
    const metaResp = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=name,mimeType,size,webViewLink`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!metaResp.ok) {
      const text = await metaResp.text();
      return new Response(JSON.stringify({ error: "Failed to fetch metadata", detail: text }), { status: 502 });
    }
    const meta = (await metaResp.json()) as { name?: string; mimeType?: string; size?: string; webViewLink?: string };

    // Fetch file content stream
    const mediaResp = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!mediaResp.ok || !mediaResp.body) {
      const text = await mediaResp.text();
      return new Response(JSON.stringify({ error: "Failed to download file", detail: text }), { status: 502 });
    }

    const headers = new Headers();
    headers.set("Content-Type", meta.mimeType || "application/octet-stream");
    if (meta.name) headers.set("X-File-Name", encodeURIComponent(meta.name));
    if (meta.size) headers.set("X-File-Size", meta.size);
    if (meta.webViewLink) headers.set("X-File-WebViewLink", meta.webViewLink);
    headers.set("Cache-Control", "no-store");

    return new Response(mediaResp.body, { headers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}


