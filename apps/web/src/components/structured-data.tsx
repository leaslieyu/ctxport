import { siteConfig } from "~/lib/site-info";

const softwareApp = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "CtxPort",
  description:
    "Copy AI conversations as structured Markdown Context Bundles. One-click copy from ChatGPT, Claude, Gemini, DeepSeek, Grok and more.",
  url: siteConfig.url,
  applicationCategory: "BrowserApplication",
  operatingSystem: "Chrome",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  author: {
    "@type": "Organization",
    name: "nicepkg",
    url: "https://github.com/nicepkg",
  },
};

const webSite = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "CtxPort",
  url: siteConfig.url,
};

export function StructuredData() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApp) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSite) }}
      />
    </>
  );
}
