"use client";
import { useEffect } from "react";

interface AuthErrorBoundaryProps {
  children: React.ReactNode;
}

export function AuthErrorBoundary({ children }: AuthErrorBoundaryProps) {
  useEffect(() => {
    // Handle NextAuth client fetch errors
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (
        event.reason?.message?.includes?.("CLIENT_FETCH_ERROR") ||
        event.reason?.message?.includes?.("Load failed")
      ) {
        console.warn("NextAuth client fetch error caught:", event.reason?.message);
        event.preventDefault(); // Prevent the error from showing in console
      }
    };

    const handleError = (event: ErrorEvent) => {
      if (
        event.message?.includes?.("CLIENT_FETCH_ERROR") ||
        event.message?.includes?.("Load failed")
      ) {
        console.warn("NextAuth client error caught:", event.message);
        event.preventDefault(); // Prevent the error from showing in console
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return <>{children}</>;
}

