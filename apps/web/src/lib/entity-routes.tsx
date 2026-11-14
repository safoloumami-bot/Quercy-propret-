import "server-only";

import { type ModuleKey, entityBySlug } from "@quercy/core";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Forbidden } from "@/components/forbidden";
import { DocumentPage } from "@/components/sales/document-page";
import { EntityListPage } from "@/components/records/entity-list-page";
import { EntityRecordPage } from "@/components/records/entity-record-page";

import { loadEntityPage } from "./entity-page";

/** Pages génériques d'une entité du moteur, montées sous chaque module (/crm/[entite]…). */
export function entityRoutes(module: ModuleKey) {
  function resolve(slug: string) {
    const def = entityBySlug(module, slug);
    if (!def) notFound();
    return def;
  }

  async function listMetadata({
    params,
  }: {
    params: Promise<{ entity: string }>;
  }): Promise<Metadata> {
    const def = entityBySlug(module, (await params).entity);
    return { title: def?.labelPlural ?? "Introuvable" };
  }

  async function recordMetadata({
    params,
  }: {
    params: Promise<{ entity: string }>;
  }): Promise<Metadata> {
    const def = entityBySlug(module, (await params).entity);
    return { title: def?.label ?? "Introuvable" };
  }

  async function ListPage({ params }: { params: Promise<{ entity: string }> }) {
    const def = resolve((await params).entity);
    const page = await loadEntityPage(def.key);
    if (!page.allowed)
      return (
        <Forbidden what={page.enabled ? "à ce module" : "à ce module, désactivé dans l'espace"} />
      );
    return (
      <EntityListPage
        entity={def.key}
        fields={page.fields}
        permissions={page.permissions}
        meId={page.meId}
      />
    );
  }

  async function RecordPage({
    params,
    searchParams,
  }: {
    params: Promise<{ entity: string; id: string }>;
    searchParams: Promise<{ onglet?: string }>;
  }) {
    const [{ entity, id }, { onglet }] = await Promise.all([params, searchParams]);
    const def = resolve(entity);
    const page = await loadEntityPage(def.key);
    if (!page.allowed) return <Forbidden what="à ce module" />;
    if (def.customPage === "document")
      return (
        <DocumentPage
          entity={def.key}
          id={id}
          fields={page.fields}
          permissions={page.permissions}
          meId={page.meId}
        />
      );
    return (
      <EntityRecordPage
        entity={def.key}
        id={id}
        fields={page.fields}
        permissions={page.permissions}
        meId={page.meId}
        initialTab={onglet}
      />
    );
  }

  return { ListPage, RecordPage, listMetadata, recordMetadata };
}
