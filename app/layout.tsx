import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0ea5e9", // Match the sky-500 branding
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Prevents auto-zoom on mobile inputs
};

export const metadata: Metadata = {
  title: "Hopeline | The answers you are looking for",
  description: "Connect with a friend to find the answers you are looking for.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hopeline",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
