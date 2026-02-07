import type { MetadataRoute } from "next";

const BASE_URL = "https://ctxport.xiaominglab.com";
const locales = ["en", "zh"] as const;

const docPages = [
  "index",
  "getting-started",
  "features",
  "context-bundle",
  "supported-platforms",
  "keyboard-shortcuts",
  "faq",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  // Home pages per locale
  for (const locale of locales) {
    entries.push({
      url: `${BASE_URL}/${locale}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    });
  }

  // Doc pages per locale
  for (const locale of locales) {
    for (const page of docPages) {
      const slug = page === "index" ? "" : `/${page}`;
      entries.push({
        url: `${BASE_URL}/${locale}/docs${slug}/`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: page === "index" ? 0.8 : 0.6,
      });
    }
  }

  return entries;
}
