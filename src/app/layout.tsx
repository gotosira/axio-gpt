import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ClientThemeProvider } from "@/components/ClientThemeProvider";
import { AuthErrorBoundary } from "@/components/AuthErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME ?? "AXIO-GPT",
  description: "CustomGPT-powered chat UI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <script src="https://apis.google.com/js/api.js" async defer></script>
        <script src="https://accounts.google.com/gsi/client" async defer></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthErrorBoundary>
          <SessionProvider>
            <ClientThemeProvider>
              {children}
            </ClientThemeProvider>
          </SessionProvider>
        </AuthErrorBoundary>
      </body>
    </html>
  );
}
