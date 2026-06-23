import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DeadlineOS — Your AI Chief of Staff",
  description:
    "DeadlineOS is an AI-powered Chief of Staff SaaS that helps you manage, visualize, and achieve goals before deadlines are missed. Powered by Google Gemini.",
  keywords: ["AI", "productivity", "goal tracking", "deadline management", "Chief of Staff"],
  openGraph: {
    title: "DeadlineOS — Your AI Chief of Staff",
    description: "Stop missing deadlines. Let AI break down your goals into winning milestones.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
