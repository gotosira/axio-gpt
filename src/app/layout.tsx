import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ClientThemeProvider } from "@/components/ClientThemeProvider";
import { AuthErrorBoundary } from "@/components/AuthErrorBoundary";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AXIO-GPT - AI-Powered Chat Platform",
  description: "Collaborate with specialized AI assistants: BaoBao (Content & Translation), DeeDee (UX Research), PungPung (Data Analysis), and FlowFlow (UX/UI Design). Experience intelligent group chat and individual AI interactions.",
  keywords: ["AI", "chat", "assistant", "collaboration", "translation", "UX", "UI", "design", "data analysis"],
  authors: [{ name: "AXIO Team" }],
  creator: "AXIO",
  publisher: "AXIO",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://axio-gpt.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "AXIO-GPT - AI-Powered Chat Platform",
    description: "Collaborate with specialized AI assistants: BaoBao (Content & Translation), DeeDee (UX Research), PungPung (Data Analysis), and FlowFlow (UX/UI Design). Experience intelligent group chat and individual AI interactions.",
    url: '/',
    siteName: 'AXIO-GPT',
    images: [
      {
        url: '/group_photo_AI.png',
        width: 1200,
        height: 630,
        alt: 'AXIO-GPT AI Team - BaoBao, DeeDee, PungPung, and FlowFlow',
        type: 'image/png',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "AXIO-GPT - AI-Powered Chat Platform",
    description: "Collaborate with specialized AI assistants: BaoBao (Content & Translation), DeeDee (UX Research), PungPung (Data Analysis), and FlowFlow (UX/UI Design). Experience intelligent group chat and individual AI interactions.",
    images: ['/group_photo_AI.png'],
    creator: '@axio',
    site: '@axio',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
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
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
