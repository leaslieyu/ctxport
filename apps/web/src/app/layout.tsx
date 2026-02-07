import { defaultLocale } from "@ctxport/shared-ui/i18n/core";
import type { Metadata } from "next";
import { Head } from "nextra/components";
import "../styles/globals.css";
import { StructuredData } from "~/components/structured-data";
import { siteConfig } from "~/lib/site-info";
import { RootLayoutClient } from "./layout-client";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description:
    "Copy AI conversations as structured Markdown Context Bundles. One-click copy from ChatGPT, Claude, Gemini, DeepSeek, Grok and more. Free Chrome extension for AI context migration.",
  metadataBase: new URL(siteConfig.url),
  alternates: {
    canonical: siteConfig.url,
    languages: {
      en: `${siteConfig.url}/en/`,
      zh: `${siteConfig.url}/zh/`,
    },
  },
  openGraph: {
    title: siteConfig.name,
    description:
      "Copy AI conversations as structured Markdown Context Bundles. One-click copy from ChatGPT, Claude, Gemini, DeepSeek, Grok and more.",
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "en_US",
    alternateLocale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description:
      "Copy AI conversations as structured Markdown Context Bundles. One-click copy from ChatGPT, Claude, Gemini, DeepSeek, Grok and more.",
    creator: "@jinmingyang666",
    site: "@jinmingyang666",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  keywords: [
    "CtxPort",
    "AI conversation copy",
    "context bundle",
    "ChatGPT copy",
    "Claude copy",
    "Gemini copy",
    "DeepSeek copy",
    "Grok copy",
    "browser extension",
    "chrome extension",
    "AI clipboard",
    "markdown export",
    "context migration",
    "AI tools",
    "AI conversation export",
    "copy AI chat",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang={defaultLocale} dir="ltr" suppressHydrationWarning>
      <Head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="dns-prefetch" href="//github.com" />
      </Head>
      <body className="min-h-screen bg-background antialiased">
        <StructuredData />
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}
