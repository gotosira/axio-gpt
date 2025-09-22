import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getToken } from "next-auth/jwt";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as unknown as Record<string, unknown>)) as any;
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let accessToken = (token as any)?.accessToken as string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let accessTokenExpires = (token as any)?.accessTokenExpires as number | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refreshToken = (token as any)?.refreshToken as string | undefined;

    const needsRefresh = !accessToken || !accessTokenExpires || Date.now() >= accessTokenExpires - 30_000; // 30s skew
    if (needsRefresh && refreshToken) {
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
          accessTokenExpires = Date.now() + (data.expires_in ?? 3600) * 1000;
        }
      } catch {}
    }

    if (!accessToken) return new Response(JSON.stringify({ error: "No token" }), { status: 401 });

    return new Response(
      JSON.stringify({ accessToken, expiresAt: accessTokenExpires ?? Date.now() + 3600 * 1000 }),
      { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}


