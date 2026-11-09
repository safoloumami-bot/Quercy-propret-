import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { Site } from "@/components/site";
import { VisitBeacon } from "@/components/visit-beacon";
import { fetchSite, imageUrl } from "@/lib/api";

type Props = { params: Promise<{ host: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const site = await fetchSite(decodeURIComponent((await params).host));
  if (!site) return { title: "Site introuvable" };
  const c = site.content;
  const title = c.seo.title || [c.name, c.hero.eyebrow].filter(Boolean).join(" · ");
  const description = c.seo.description || c.hero.subtitle || undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: c.name,
      locale: "fr_FR",
      images: c.hero.image ? [imageUrl(site, c.hero.image.fileId)] : undefined,
    },
    icons: c.logo ? [{ url: imageUrl(site, c.logo.fileId) }] : undefined,
  };
}

export default async function SitePage({ params }: Props) {
  const site = await fetchSite(decodeURIComponent((await params).host));
  if (!site) notFound();
  return (
    <>
      <Site site={site} base={(await headers()).get("x-site-base") ?? ""} />
      <VisitBeacon />
    </>
  );
}
