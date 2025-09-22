// NextAuth type extensions

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    // Expose Google tokens for client features like Drive picker
    googleAccessToken?: string | null;
    googleAccessTokenExpires?: number | null;
  }
}
