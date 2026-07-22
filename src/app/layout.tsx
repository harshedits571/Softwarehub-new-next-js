import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import Script from "next/script";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://softwarehubs.in"),
  title: "SoftwareHubs.in - Premium Creative Assets & Software",
  description: "Download premium pre-configured Adobe tools, plugins, VFX packs, and creative assets to build your next big project on SoftwareHubs.in.",
  keywords: ["SoftwareHubs", "SoftwareHubs.in", "Creative Assets", "Adobe Plugins", "VFX Packs", "Premium Software", "Video Editing Assets", "Creators Resources", "Harsh Edits"],
  openGraph: {
    title: "SoftwareHubs.in - Premium Creative Assets & Software",
    description: "Download premium pre-configured Adobe tools, plugins, VFX packs, and creative assets on SoftwareHubs.in.",
    url: "https://softwarehubs.in",
    type: "website",
    siteName: "SoftwareHubs.in Store",
  },
  twitter: {
    card: "summary_large_image",
    title: "SoftwareHubs.in - Premium Creative Assets",
    description: "Download premium creative assets to build your next big project on SoftwareHubs.in.",
  },
};

import GlobalScrollReveal from "../components/GlobalScrollReveal";
import VisitorTracker from "../components/VisitorTracker";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body className="font-sans min-h-full flex flex-col bg-[#0b0b10] text-gray-300 antialiased selection:bg-brand-500/30 selection:text-white">
        <AuthProvider>
          {children}
        </AuthProvider>
        <GlobalScrollReveal />
        <VisitorTracker />
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
