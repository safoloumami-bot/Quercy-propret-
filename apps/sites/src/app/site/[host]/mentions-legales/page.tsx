import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { fetchSite } from "@/lib/api";

type Props = { params: Promise<{ host: string }> };

export const metadata: Metadata = { title: "Mentions légales" };

export default async function LegalPage({ params }: Props) {
  const site = await fetchSite(decodeURIComponent((await params).host));
  if (!site) notFound();
  const { content: c, theme } = site;
  return (
    <main style={{ background: theme.background, color: theme.text }} className="min-h-dvh">
      <div className="mx-auto max-w-3xl space-y-8 px-6 py-16 leading-relaxed">
        <a href="/" className="text-sm underline underline-offset-4">
          ← Retour au site
        </a>
        <h1 className="text-3xl font-semibold">Mentions légales</h1>
        <section>
          <h2 className="text-lg font-semibold">Éditeur du site</h2>
          <p className="mt-2 whitespace-pre-line">{c.legal.publisher || c.name}</p>
          {c.contact.email ? <p>Contact : {c.contact.email}</p> : null}
        </section>
        <section>
          <h2 className="text-lg font-semibold">Hébergement</h2>
          <p className="mt-2 whitespace-pre-line">{c.legal.host || "[Hébergeur à compléter]"}</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Données personnelles</h2>
          <p className="mt-2">
            Les informations envoyées par le formulaire de contact servent uniquement à répondre à
            votre demande. Vous pouvez demander leur consultation, leur rectification ou leur
            suppression en écrivant à {c.contact.email || "l'éditeur du site"}. Ce site ne dépose
            aucun cookie publicitaire.
          </p>
        </section>
      </div>
    </main>
  );
}
