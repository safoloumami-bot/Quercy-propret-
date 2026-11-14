"use client";

import {
  DEFAULT_PROCEDURE,
  TASK_FREQUENCIES,
  TASK_LIBRARY,
  type TaskFrequency,
  parseMissionTasks,
} from "@quercy/core";
import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import { Callout } from "@quercy/ui/components/callout";
import { Checkbox } from "@quercy/ui/components/checkbox";
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
import type { inferRouterOutputs } from "@trpc/server";
import {
  CameraIcon,
  ClipboardListIcon,
  FileDownIcon,
  FileUpIcon,
  HistoryIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import * as React from "react";

import { FormField } from "@/components/form-field";
import { errorMessage, useTRPC } from "@/lib/trpc";
import type { AppRouter } from "@/server/trpc/root";

type MissionList = inferRouterOutputs<AppRouter>["missions"]["list"];
type Sheet = MissionList["sheets"][number];

interface TaskDraft {
  zone: string;
  label: string;
  frequency: TaskFrequency;
  critical: boolean;
  photoRequired: boolean;
}

interface SheetDraft {
  id?: string;
  serviceLineId: string;
  title: string;
  durationMinutes: string;
  instructions: string;
  products: string;
  equipment: string;
  procedure: string;
  tasks: TaskDraft[];
  consumables: { productId: string; plannedQuantity: string }[];
  note: string;
}

const ALL = "__site__";

function draftOf(sheet?: Sheet): SheetDraft {
  return sheet
    ? {
        id: sheet.id,
        serviceLineId: sheet.serviceLine?.id ?? ALL,
        title: sheet.title,
        durationMinutes: sheet.durationMinutes ? String(sheet.durationMinutes) : "",
        instructions: sheet.instructions ?? "",
        products: sheet.products ?? "",
        equipment: sheet.equipment ?? "",
        procedure: sheet.procedure ?? "",
        tasks: sheet.tasks.map(({ zone, label, frequency, critical, photoRequired }) => ({
          zone,
          label,
          frequency,
          critical,
          photoRequired,
        })),
        consumables: sheet.consumables.map((c) => ({
          productId: c.productId,
          plannedQuantity: String(c.plannedQuantity),
        })),
        note: "",
      }
    : {
        serviceLineId: ALL,
        title: "Fiche mission",
        durationMinutes: "",
        instructions: "",
        products: "",
        equipment: "",
        procedure: DEFAULT_PROCEDURE,
        tasks: [],
        consumables: [],
        note: "",
      };
}

/** Tâches regroupées par zone, dans l'ordre de la fiche. */
function byZone<T extends { zone: string }>(tasks: T[]) {
  const zones: { zone: string; tasks: T[] }[] = [];
  for (const t of tasks) {
    const last = zones.at(-1);
    if (last && last.zone === t.zone) last.tasks.push(t);
    else zones.push({ zone: t.zone, tasks: [t] });
  }
  return zones;
}

/**
 * Fiches mission d'un site : tâches à cocher par zone (fréquence, point critique, photo
 * obligatoire), procédure, produits, matériel, consignes. Chaque modification crée une version ;
 * l'agent reçoit la nouvelle version sur ses passages pas encore commencés.
 */
export function MissionSheets({ siteId }: { siteId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const list = useQuery(trpc.missions.list.queryOptions({ siteId }));
  const [draft, setDraft] = React.useState<SheetDraft | null>(null);
  const [history, setHistory] = React.useState<Sheet | null>(null);
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: trpc.missions.list.queryKey({ siteId }) });
  const archive = useMutation(
    trpc.missions.archive.mutationOptions({
      onSuccess: () => {
        toast.success("Fiche retirée.");
        void refresh();
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );

  if (list.isPending) return <Skeleton className="h-24" />;
  if (list.error) return <Callout variant="warning">{errorMessage(list.error)}</Callout>;
  const { sheets, canManage, serviceLines, products } = list.data;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Fiches mission</h3>
        {canManage ? (
          <Button size="sm" variant="secondary" onClick={() => setDraft(draftOf())}>
            <PlusIcon aria-hidden /> Nouvelle fiche
          </Button>
        ) : null}
      </div>
      {sheets.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Pas encore de fiche mission : l&apos;application propose la grille type de la prestation.
          {canManage ? " Créez-en une depuis la bibliothèque de tâches." : ""}
        </p>
      ) : (
        sheets.map((s) => (
          <div key={s.id} className="rounded-md border border-border">
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
              <ClipboardListIcon className="size-4 text-muted-foreground" aria-hidden />
              <span className="font-medium">{s.title}</span>
              <Badge variant="outline">v{s.version}</Badge>
              <span className="text-xs text-muted-foreground">
                {s.serviceLine ? s.serviceLine.name : "Toutes les prestations"} · {s.tasks.length}{" "}
                tâche{s.tasks.length > 1 ? "s" : ""}
                {s.updatedBy ? ` · modifiée par ${s.updatedBy}` : ""}
              </span>
              {canManage ? (
                <span className="ml-auto flex gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Modifier la fiche"
                    onClick={() => setDraft(draftOf(s))}
                  >
                    <PencilIcon />
                  </Button>
                  <Button asChild size="icon-sm" variant="ghost" aria-label="Exporter en Excel">
                    <a href={`/api/nettoyage/fiche-mission?sheetId=${s.id}`}>
                      <FileDownIcon />
                    </a>
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Historique des versions"
                    onClick={() => setHistory(s)}
                  >
                    <HistoryIcon />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Retirer la fiche"
                    disabled={archive.isPending}
                    onClick={() => {
                      if (confirm(`Retirer « ${s.title} » ? Les passages déjà faits la gardent.`))
                        archive.mutate({ id: s.id });
                    }}
                  >
                    <Trash2Icon />
                  </Button>
                </span>
              ) : null}
            </div>
            <div className="grid gap-3 p-3 text-sm md:grid-cols-2">
              {byZone(s.tasks).map((z) => (
                <div key={z.zone}>
                  <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {z.zone}
                  </p>
                  <ul className="space-y-0.5">
                    {z.tasks.map((t, i) => (
                      <li key={i} className="flex flex-wrap items-center gap-1.5">
                        <span>{t.label}</span>
                        {t.frequency !== "each_visit" ? (
                          <span className="text-xs text-muted-foreground">
                            ({t.frequencyLabel.toLowerCase()})
                          </span>
                        ) : null}
                        {t.critical ? <Badge variant="warning">Critique</Badge> : null}
                        {t.photoRequired ? (
                          <Badge variant="info">
                            <CameraIcon className="size-3" aria-hidden /> Photo
                          </Badge>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {s.consumables.length ? (
                <div>
                  <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Consommables prévus
                  </p>
                  <ul className="space-y-0.5">
                    {s.consumables.map((c) => (
                      <li key={c.productId}>
                        {c.name}{" "}
                        <span className="text-muted-foreground">× {c.plannedQuantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        ))
      )}

      {draft ? (
        <SheetEditor
          siteId={siteId}
          draft={draft}
          serviceLines={serviceLines}
          products={products}
          onChange={setDraft}
          onClose={() => setDraft(null)}
          onSaved={() => {
            setDraft(null);
            void refresh();
          }}
        />
      ) : null}
      <VersionsDialog sheet={history} onClose={() => setHistory(null)} />
    </section>
  );
}

function SheetEditor({
  siteId,
  draft,
  serviceLines,
  products,
  onChange,
  onClose,
  onSaved,
}: {
  siteId: string;
  draft: SheetDraft;
  serviceLines: { id: string; name: string }[];
  products: MissionList["products"];
  onChange: (d: SheetDraft) => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const trpc = useTRPC();
  const [libraryZone, setLibraryZone] = React.useState("");
  const [importErrors, setImportErrors] = React.useState<string[]>([]);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const save = useMutation(
    trpc.missions.save.mutationOptions({
      onSuccess: (r) => {
        toast.success(
          r.refreshed
            ? `Fiche enregistrée (version ${r.version}) : ${r.refreshed} passage(s) à venir mis à jour.`
            : `Fiche enregistrée (version ${r.version}).`,
        );
        onSaved();
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  const set = (patch: Partial<SheetDraft>) => onChange({ ...draft, ...patch });
  const setTask = (i: number, patch: Partial<TaskDraft>) =>
    set({ tasks: draft.tasks.map((t, k) => (k === i ? { ...t, ...patch } : t)) });

  async function importFile(file: File) {
    const { readSheet } = await import("read-excel-file/browser");
    const sheet = await readSheet(file);
    const [headers = [], ...rows] = sheet.map((r) => r.map((c) => (c == null ? "" : String(c))));
    const parsed = parseMissionTasks(headers, rows);
    setImportErrors(parsed.errors);
    if (parsed.tasks.length) {
      set({ tasks: parsed.tasks });
      toast.success(`${parsed.tasks.length} tâche(s) importée(s). Vérifiez puis enregistrez.`);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {draft.id ? "Modifier la fiche mission" : "Nouvelle fiche mission"}
          </DialogTitle>
          <DialogDescription>
            Seules les tâches dues le jour du passage s&apos;affichent à l&apos;agent (hebdomadaires
            au premier passage de la semaine, mensuelles au premier du mois…). Une modification crée
            une nouvelle version.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField id="mission-title" label="Titre">
            <Input
              id="mission-title"
              value={draft.title}
              onChange={(e) => set({ title: e.target.value })}
            />
          </FormField>
          <FormField id="mission-line" label="Prestation">
            <Select value={draft.serviceLineId} onValueChange={(v) => set({ serviceLineId: v })}>
              <SelectTrigger id="mission-line">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toutes les prestations du site</SelectItem>
                {serviceLines.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField id="mission-duration" label="Durée prévue (minutes)">
            <Input
              id="mission-duration"
              inputMode="numeric"
              value={draft.durationMinutes}
              onChange={(e) => set({ durationMinutes: e.target.value.replace(/\D/g, "") })}
            />
          </FormField>
        </div>
        <FormField id="mission-instructions" label="Consignes">
          <Textarea
            id="mission-instructions"
            rows={2}
            value={draft.instructions}
            placeholder="Ex. ne pas utiliser de javel sur le marbre du hall ; prévenir la gardienne en arrivant."
            onChange={(e) => set({ instructions: e.target.value })}
          />
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField id="mission-products" label="Produits">
            <Textarea
              id="mission-products"
              rows={2}
              value={draft.products}
              onChange={(e) => set({ products: e.target.value })}
            />
          </FormField>
          <FormField id="mission-equipment" label="Matériel">
            <Textarea
              id="mission-equipment"
              rows={2}
              value={draft.equipment}
              onChange={(e) => set({ equipment: e.target.value })}
            />
          </FormField>
        </div>
        <FormField id="mission-procedure" label="Procédure">
          <Textarea
            id="mission-procedure"
            rows={4}
            value={draft.procedure}
            onChange={(e) => set({ procedure: e.target.value })}
          />
        </FormField>

        <div className="space-y-2">
          <div className="flex flex-wrap items-end gap-2">
            <h4 className="mr-auto text-sm font-medium">
              Consommables du stock ({draft.consumables.length})
            </h4>
            <Select
              value=""
              onValueChange={(productId) => {
                if (draft.consumables.some((c) => c.productId === productId)) return;
                set({ consumables: [...draft.consumables, { productId, plannedQuantity: "1" }] });
              }}
            >
              <SelectTrigger className="w-56" aria-label="Ajouter un article du stock">
                <SelectValue
                  placeholder={products.length ? "Ajouter un article" : "Aucun article en stock"}
                />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.stockQuantity} en stock)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {draft.consumables.length ? (
            <ul className="space-y-1">
              {draft.consumables.map((c, i) => (
                <li key={c.productId} className="flex items-center gap-2 text-sm">
                  <span className="mr-auto">
                    {products.find((p) => p.id === c.productId)?.name ?? "Article retiré"}
                  </span>
                  <Input
                    className="w-20"
                    inputMode="decimal"
                    aria-label="Quantité prévue par passage"
                    value={c.plannedQuantity}
                    onChange={(e) =>
                      set({
                        consumables: draft.consumables.map((x, k) =>
                          k === i
                            ? { ...x, plannedQuantity: e.target.value.replace(/[^\d.,]/g, "") }
                            : x,
                        ),
                      })
                    }
                  />
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Retirer l'article"
                    onClick={() =>
                      set({ consumables: draft.consumables.filter((_, k) => k !== i) })
                    }
                  >
                    <Trash2Icon />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              L&apos;agent relève sur l&apos;appli les quantités utilisées ; elles sortent du stock
              à la clôture du passage.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-end gap-2">
            <h4 className="mr-auto text-sm font-medium">Tâches ({draft.tasks.length})</h4>
            <Select value={libraryZone} onValueChange={setLibraryZone}>
              <SelectTrigger className="w-56" aria-label="Zone de la bibliothèque">
                <SelectValue placeholder="Bibliothèque : choisir une zone" />
              </SelectTrigger>
              <SelectContent>
                {TASK_LIBRARY.map((z) => (
                  <SelectItem key={z.zone} value={z.zone}>
                    {z.zone} ({z.tasks.length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="secondary"
              disabled={!libraryZone}
              onClick={() => {
                const zone = TASK_LIBRARY.find((z) => z.zone === libraryZone);
                if (!zone) return;
                set({
                  tasks: [
                    ...draft.tasks,
                    ...zone.tasks.map((t) => ({
                      zone: zone.zone,
                      label: t.label,
                      frequency: t.frequency,
                      critical: t.critical,
                      photoRequired: t.photo,
                    })),
                  ],
                });
                setLibraryZone("");
              }}
            >
              Ajouter la zone
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                set({
                  tasks: [
                    ...draft.tasks,
                    {
                      zone: draft.tasks.at(-1)?.zone ?? "",
                      label: "",
                      frequency: "each_visit",
                      critical: false,
                      photoRequired: false,
                    },
                  ],
                })
              }
            >
              <PlusIcon aria-hidden /> Tâche
            </Button>
            <Button size="sm" variant="ghost" onClick={() => fileInput.current?.click()}>
              <FileUpIcon aria-hidden /> Importer Excel
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importFile(file).catch((err) => toast.error(errorMessage(err)));
                e.target.value = "";
              }}
            />
          </div>
          {importErrors.length ? (
            <Callout variant="warning">
              {importErrors.slice(0, 6).join(" ")}
              {importErrors.length > 6 ? ` … et ${importErrors.length - 6} autre(s).` : ""}
            </Callout>
          ) : null}
          {draft.tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ajoutez une zone de la bibliothèque, une tâche à la main, ou importez un fichier Excel
              (colonnes Zone, Tâche, Fréquence, Critique, Photo obligatoire).
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Zone</th>
                    <th className="px-2 py-1.5 font-medium">Tâche</th>
                    <th className="px-2 py-1.5 font-medium">Fréquence</th>
                    <th className="px-2 py-1.5 font-medium">Critique</th>
                    <th className="px-2 py-1.5 font-medium">Photo</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {draft.tasks.map((t, i) => (
                    <tr key={i}>
                      <td className="p-1">
                        <Input
                          aria-label={`Zone, tâche ${i + 1}`}
                          value={t.zone}
                          className="h-8 w-36"
                          onChange={(e) => setTask(i, { zone: e.target.value })}
                        />
                      </td>
                      <td className="p-1">
                        <Input
                          aria-label={`Libellé, tâche ${i + 1}`}
                          value={t.label}
                          className="h-8 min-w-64"
                          onChange={(e) => setTask(i, { label: e.target.value })}
                        />
                      </td>
                      <td className="p-1">
                        <Select
                          value={t.frequency}
                          onValueChange={(v) => setTask(i, { frequency: v as TaskFrequency })}
                        >
                          <SelectTrigger
                            className="h-8 w-44"
                            aria-label={`Fréquence, tâche ${i + 1}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TASK_FREQUENCIES.map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-1 text-center">
                        <Checkbox
                          aria-label={`Critique, tâche ${i + 1}`}
                          checked={t.critical}
                          onCheckedChange={(v) => setTask(i, { critical: v === true })}
                        />
                      </td>
                      <td className="p-1 text-center">
                        <Checkbox
                          aria-label={`Photo obligatoire, tâche ${i + 1}`}
                          checked={t.photoRequired}
                          onCheckedChange={(v) => setTask(i, { photoRequired: v === true })}
                        />
                      </td>
                      <td className="p-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Retirer la tâche ${i + 1}`}
                          onClick={() => set({ tasks: draft.tasks.filter((_, k) => k !== i) })}
                        >
                          <Trash2Icon />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {draft.id ? (
          <FormField id="mission-note" label="Ce qui change (pour l'historique)">
            <Input
              id="mission-note"
              value={draft.note}
              placeholder="Ex. vitres du hall passées en mensuel"
              onChange={(e) => set({ note: e.target.value })}
            />
          </FormField>
        ) : null}
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={save.isPending}
            onClick={() =>
              save.mutate({
                id: draft.id,
                siteId,
                serviceLineId: draft.serviceLineId === ALL ? null : draft.serviceLineId,
                title: draft.title,
                durationMinutes: draft.durationMinutes ? Number(draft.durationMinutes) : null,
                instructions: draft.instructions,
                products: draft.products,
                equipment: draft.equipment,
                procedure: draft.procedure,
                tasks: draft.tasks,
                consumables: draft.consumables.map((c) => ({
                  productId: c.productId,
                  plannedQuantity: Number(c.plannedQuantity.replace(",", ".")) || 0,
                })),
                note: draft.note || undefined,
              })
            }
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VersionsDialog({ sheet, onClose }: { sheet: Sheet | null; onClose: () => void }) {
  const trpc = useTRPC();
  const versions = useQuery({
    ...trpc.missions.versions.queryOptions({ id: sheet?.id ?? "" }),
    enabled: Boolean(sheet),
  });
  return (
    <Dialog open={sheet !== null} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Historique — {sheet?.title}</DialogTitle>
          <DialogDescription>
            Les passages déjà faits gardent la version avec laquelle ils ont été réalisés.
          </DialogDescription>
        </DialogHeader>
        {versions.isPending ? (
          <Skeleton className="h-24" />
        ) : (
          <ol className="space-y-2 text-sm">
            {(versions.data ?? []).map((v) => (
              <li key={v.version} className="flex gap-3">
                <Badge variant="outline">v{v.version}</Badge>
                <div>
                  <p>
                    {new Date(v.createdAt).toLocaleString("fr-FR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    {v.author ? ` · ${v.author}` : ""} · {v.tasks} tâche(s)
                  </p>
                  {v.note ? <p className="text-muted-foreground">{v.note}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
