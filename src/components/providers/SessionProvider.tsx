"use client";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { useEffect } from "react";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Handle any client-side NextAuth errors
    const handleError = (event: ErrorEvent) => {
      if (event.message.includes('CLIENT_FETCH_ERROR') || event.message.includes('Load failed')) {
        console.warn('NextAuth client fetch error - this is often harmless during development');
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  return (
    <NextAuthSessionProvider
      refetchInterval={0} // Disable automatic refetching to reduce errors
      refetchOnWindowFocus={false} // Disable refetch on window focus
    >
      {children}
    </NextAuthSessionProvider>
  );
}
