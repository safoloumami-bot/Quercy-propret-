"use client";

import {
  SITE_INFO_CATEGORIES,
  SITE_INFO_VISIBILITIES,
  type SiteInfoCategory,
  type SiteInfoVisibility,
  recordPath,
} from "@quercy/core";
import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import { Callout } from "@quercy/ui/components/callout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@quercy/ui/components/dialog";
import { Input } from "@quercy/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@quercy/ui/components/select";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { Textarea } from "@quercy/ui/components/textarea";
import { toast } from "@quercy/ui/components/toaster";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EyeIcon, KeyRoundIcon, LockIcon, PencilIcon, PlusIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { FormField } from "@/components/form-field";
import { errorMessage, useTRPC } from "@/lib/trpc";

interface Draft {
  id?: string;
  category: SiteInfoCategory;
  label: string;
  content: string;
  visibility: SiteInfoVisibility;
  agentId: string;
}

const EMPTY: Draft = {
  category: "instructions",
  label: "",
  content: "",
  visibility: "site_agents",
  agentId: "",
};

function VisibilityBadge({
  visibility,
  agentName,
}: {
  visibility: string;
  agentName: string | null;
}) {
  if (visibility === "managers")
    return (
      <Badge variant="neutral">
        <LockIcon className="size-3" aria-hidden /> Responsables
      </Badge>
    );
  if (visibility === "agent")
    return (
      <Badge variant="info">
        <UserIcon className="size-3" aria-hidden /> {agentName ?? "Un agent"}
      </Badge>
    );
  return (
    <Badge variant="outline">
      <EyeIcon className="size-3" aria-hidden /> Agents du site
    </Badge>
  );
}

/**
 * Fiche de site : accès, consignes, sols, produits, risques… Chaque information a sa
 * visibilité ; un agent ne voit que ce qui le concerne. Sous-sites et prestations.
 */
export function SiteSheet({ siteId }: { siteId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const sheet = useQuery(trpc.sites.sheet.queryOptions({ siteId }));
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: trpc.sites.sheet.queryKey({ siteId }) });
  const save = useMutation(
    trpc.sites.saveInfo.mutationOptions({
      onSuccess: () => {
        toast.success("Fiche du site mise à jour.");
        setDraft(null);
        void refresh();
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  const archive = useMutation(
    trpc.sites.archiveInfo.mutationOptions({
      onSuccess: () => {
        setDraft(null);
        void refresh();
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );

  if (sheet.isPending) return <Skeleton className="h-48" />;
  if (sheet.error) return <Callout variant="warning">{errorMessage(sheet.error)}</Callout>;
  const { site, services, infos, canManage, agents } = sheet.data;
  const grouped = SITE_INFO_CATEGORIES.map((c) => ({
    ...c,
    items: infos.filter((i) => i.category === c.value),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-5">
      <section className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="space-y-1">
          <p>
            {site.code ? <Badge variant="outline">{site.code}</Badge> : null}{" "}
            <span className="font-medium">{site.name}</span>
          </p>
          {site.client ? (
            <p className="text-muted-foreground">
              Client :{" "}
              <Link
                className="text-primary hover:underline"
                href={recordPath("company", site.client.id)}
              >
                {site.client.name}
              </Link>
            </p>
          ) : null}
          {site.parent ? (
            <p className="text-muted-foreground">
              Fait partie de :{" "}
              <Link
                className="text-primary hover:underline"
                href={recordPath("site", site.parent.id)}
              >
                {site.parent.name}
              </Link>
            </p>
          ) : null}
          <p className="text-muted-foreground">
            {[site.address, [site.postalCode, site.city].filter(Boolean).join(" ")]
              .filter(Boolean)
              .join(", ") || "Adresse non renseignée"}
          </p>
        </div>
        <div className="space-y-1">
          {site.openingHours ? <p>Horaires autorisés : {site.openingHours}</p> : null}
          {site.accessCode || site.keys ? (
            <p className="flex items-center gap-1.5">
              <KeyRoundIcon className="size-4 text-muted-foreground" aria-hidden />
              {[site.accessCode && `Code : ${site.accessCode}`, site.keys]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
          {site.instructions ? <p className="whitespace-pre-line">{site.instructions}</p> : null}
        </div>
      </section>

      {site.children.length ? (
        <section>
          <h3 className="mb-1.5 text-sm font-medium">Sous-sites ({site.children.length})</h3>
          <div className="flex flex-wrap gap-1.5">
            {site.children.map((c) => (
              <Link key={c.id} href={recordPath("site", c.id)}>
                <Badge variant="outline" className="hover:bg-accent">
                  {c.code ? `${c.code} · ` : ""}
                  {c.name}
                </Badge>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {services.length ? (
        <section>
          <h3 className="mb-1.5 text-sm font-medium">Prestations</h3>
          <ul className="space-y-1 text-sm">
            {services.map((s) => (
              <li key={s.id}>
                <span className="font-medium">{s.name}</span>
                {s.rule ? ` — ${s.rule}` : ""}
                {s.startTime ? ` à ${s.startTime}` : ""}
                {s.durationMinutes ? ` · ${s.durationMinutes} min` : ""}
                {s.agentName ? ` · ${s.agentName}` : ""}
                {s.seriesStatus === "proposed" ? (
                  <Badge variant="warning" className="ml-1.5">
                    À valider
                  </Badge>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Informations du site</h3>
          {canManage ? (
            <Button size="sm" variant="secondary" onClick={() => setDraft(EMPTY)}>
              <PlusIcon aria-hidden /> Ajouter
            </Button>
          ) : null}
        </div>
        {grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune information pour l&apos;instant.</p>
        ) : (
          grouped.map((g) => (
            <div key={g.value}>
              <h4 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {g.label}
              </h4>
              <ul className="divide-y rounded-md border border-border">
                {g.items.map((i) => (
                  <li key={i.id} className="flex items-start gap-3 px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{i.label}</p>
                      <p className="whitespace-pre-line text-muted-foreground">{i.content}</p>
                    </div>
                    {canManage ? (
                      <>
                        <VisibilityBadge visibility={i.visibility} agentName={i.agentName} />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Modifier « ${i.label} »`}
                          onClick={() =>
                            setDraft({
                              id: i.id,
                              category: i.category as SiteInfoCategory,
                              label: i.label,
                              content: i.content,
                              visibility: i.visibility as SiteInfoVisibility,
                              agentId: i.agentId ?? "",
                            })
                          }
                        >
                          <PencilIcon />
                        </Button>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <Dialog open={draft !== null} onOpenChange={(o) => (!o ? setDraft(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {draft?.id ? "Modifier l'information" : "Nouvelle information"}
            </DialogTitle>
            <DialogDescription>
              Choisissez qui la voit : tous les agents du site, un seul agent, ou les responsables.
            </DialogDescription>
          </DialogHeader>
          {draft ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField id="info-category" label="Catégorie">
                  <Select
                    value={draft.category}
                    onValueChange={(v) => setDraft({ ...draft, category: v as SiteInfoCategory })}
                  >
                    <SelectTrigger id="info-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SITE_INFO_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField id="info-visibility" label="Visible par">
                  <Select
                    value={draft.visibility}
                    onValueChange={(v) =>
                      setDraft({ ...draft, visibility: v as SiteInfoVisibility })
                    }
                  >
                    <SelectTrigger id="info-visibility">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SITE_INFO_VISIBILITIES.map((v) => (
                        <SelectItem key={v.value} value={v.value}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
              {draft.visibility === "agent" ? (
                <FormField id="info-agent" label="Agent">
                  <Select
                    value={draft.agentId}
                    onValueChange={(v) => setDraft({ ...draft, agentId: v })}
                  >
                    <SelectTrigger id="info-agent">
                      <SelectValue placeholder="Choisir l'agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              ) : null}
              <FormField id="info-label" label="Titre">
                <Input
                  id="info-label"
                  value={draft.label}
                  placeholder="Ex. Local poubelles"
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                />
              </FormField>
              <FormField id="info-content" label="Information">
                <Textarea
                  id="info-content"
                  rows={4}
                  value={draft.content}
                  placeholder="Ex. Clé dans la boîte à code, code 4682, porte au fond de la cour."
                  onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                />
              </FormField>
            </div>
          ) : null}
          <DialogFooter>
            {draft?.id ? (
              <Button
                variant="ghost"
                className="mr-auto"
                onClick={() => archive.mutate({ id: draft.id! })}
                disabled={archive.isPending}
              >
                Retirer de la fiche
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => setDraft(null)}>
              Annuler
            </Button>
            <Button
              disabled={!draft || save.isPending}
              onClick={() =>
                draft &&
                save.mutate({
                  id: draft.id,
                  siteId,
                  category: draft.category,
                  label: draft.label,
                  content: draft.content,
                  visibility: draft.visibility,
                  agentId: draft.agentId || null,
                })
              }
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
