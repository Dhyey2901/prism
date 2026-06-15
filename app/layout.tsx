import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: "Prism — AI-powered data reporting",
  description:
    "Turn raw spreadsheets into insights, visualizations, and exportable reports. Parsed in your browser — no raw data ever leaves your machine.",
  openGraph: {
    title: "Prism — AI-powered data reporting",
    description:
      "Spreadsheets in. Insights, charts, and PDF reports out. No raw data ever leaves your browser.",
    siteName: "Prism",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Prism — AI-powered data reporting",
    description:
      "Spreadsheets in. Insights, charts, and PDF reports out. No raw data ever leaves your browser.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/* suppressHydrationWarning: browser extensions (e.g. Grammarly) inject
          attributes into <body> before React hydrates */}
      <body className="min-h-full" suppressHydrationWarning>
        <ClerkProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
