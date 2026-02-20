import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "SwissKnife — AI-Powered Mini App Studio",
  description:
    "Describe any tool in plain English. Get a fully interactive mobile app in seconds. Open source, declarative, secure by design.",
  keywords: [
    "AI",
    "mini apps",
    "app generator",
    "React Native",
    "Claude",
    "open source",
    "declarative UI",
    "mobile apps",
  ],
  openGraph: {
    title: "SwissKnife — AI-Powered Mini App Studio",
    description:
      "Describe any tool in plain English. Get a fully interactive mobile app in seconds.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SwissKnife — AI-Powered Mini App Studio",
    description:
      "Describe any tool in plain English. Get a fully interactive mobile app in seconds.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
