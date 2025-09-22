import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  debug: process.env.NODE_ENV === "development", // Enable debug mode in development
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/drive.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    session: async ({ session, token }) => {
      if (session?.user && token?.sub) {
        session.user.id = token.sub;
      }
      // Expose Google access token for client-side Google Drive access
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session as any).googleAccessToken = (token as any).accessToken ?? null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session as any).googleAccessTokenExpires = (token as any).accessTokenExpires ?? null;
      return session;
    },
    // Persist OAuth tokens and refresh when expired
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jwt: async ({ token, account, user }: any) => {
      if (user) {
        token.uid = user.id;
      }

      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token ?? token.refreshToken;
        token.accessTokenExpires = Date.now() + (account.expires_in ?? 3600) * 1000;
        token.tokenType = account.token_type ?? "Bearer";
        return token;
      }

      // If token has not expired, return it
      if (token.accessToken && token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
        return token;
      }

      // Try to refresh access token
      try {
        if (!token.refreshToken) return token;
        const params = new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID as string,
          client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
          grant_type: "refresh_token",
          refresh_token: token.refreshToken as string,
        });
        const resp = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
        });
        if (!resp.ok) return token;
        const refreshed = await resp.json();
        token.accessToken = refreshed.access_token ?? token.accessToken;
        token.accessTokenExpires = Date.now() + (refreshed.expires_in ?? 3600) * 1000;
        token.tokenType = refreshed.token_type ?? token.tokenType;
        token.refreshToken = refreshed.refresh_token ?? token.refreshToken;
        return token;
      } catch {
        return token;
      }
    },
  },
  session: {
    strategy: "jwt",
  },
  // Ensure a stable secret is provided to NextAuth (required in production)
  secret: process.env.NEXTAUTH_SECRET,
};
