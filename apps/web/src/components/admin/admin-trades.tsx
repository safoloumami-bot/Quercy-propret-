"use client";

import {
  CATALOG_UNITS,
  CATALOG_VAT_RATES,
  type CatalogItem,
  GENERAL_TRADE_KEY,
  INDUSTRIES,
  MODULES,
  MODULE_KEYS,
  type ModuleKey,
  type TradePreset,
  slugify,
} from "@quercy/core";
import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@quercy/ui/components/card";
import { Checkbox } from "@quercy/ui/components/checkbox";
import { Input } from "@quercy/ui/components/input";
import { Label } from "@quercy/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@quercy/ui/components/select";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { Switch } from "@quercy/ui/components/switch";
import { Textarea } from "@quercy/ui/components/textarea";
import { toast } from "@quercy/ui/components/toaster";
import { cn } from "@quercy/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import * as React from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { TRADE_ICONS } from "@/components/trades/trade-picker";
import { errorMessage, useTRPC } from "@/lib/trpc";

const UNIT_LABELS: Record<(typeof CATALOG_UNITS)[number], string> = {
  unit: "unité",
  hour: "heure",
  day: "jour",
  flat: "forfait",
  sqm: "m²",
  kg: "kg",
};

type Draft = Omit<TradePreset, "builtin" | "customized"> & { isNew: boolean };

const EMPTY: Draft = {
  isNew: true,
  key: "",
  label: "",
  hint: "",
  industry: "services",
  keywords: [],
  modules: ["crm", "sales", "calendar"],
  catalog: [],
  decennial: false,
  renovationVat: false,
  assistant: "",
  active: true,
  position: 500,
};

function toDraft(p: TradePreset): Draft {
  const { builtin: _b, customized: _c, ...rest } = p;
  return { ...rest, catalog: rest.catalog.map((c) => ({ ...c })), isNew: false };
}

/**
 * Administration des corps de métier : ce que le logiciel prépare pour chaque métier
 * (mots qui le reconnaissent, modules conseillés, catalogue, mentions, consignes de
 * l'assistant), et la base neutre des entreprises dont le métier n'est pas reconnu.
 */
export function AdminTrades() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const list = useQuery(trpc.admin.tradePresets.queryOptions());
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [keywordsText, setKeywordsText] = React.useState("");
  const [confirmReset, setConfirmReset] = React.useState(false);

  const current = list.data?.find((p) => p.key === draft?.key);

  function open(next: Draft) {
    setDraft(next);
    setKeywordsText(next.keywords.join("\n"));
  }

  React.useEffect(() => {
    if (!draft && list.data?.[0]) open(toDraft(list.data[0]));
  }, [draft, list.data]);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: trpc.admin.tradePresets.queryKey() });

  const save = useMutation(
    trpc.admin.saveTradePreset.mutationOptions({
      onSuccess: async () => {
        toast.success("Métier enregistré. Il s'applique aux prochains espaces et choix de métier.");
        await refresh();
        setDraft((d) => (d ? { ...d, isNew: false } : d));
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  const reset = useMutation(
    trpc.admin.resetTradePreset.mutationOptions({
      onSuccess: async ({ result }) => {
        toast.success(result === "reset" ? "Version d'origine rétablie." : "Métier supprimé.");
        setConfirmReset(false);
        const fresh = await queryClient.fetchQuery(trpc.admin.tradePresets.queryOptions());
        const same = fresh.find((p) => p.key === draft?.key);
        open(toDraft(same ?? fresh[0]!));
      },
      onError: (e) => {
        setConfirmReset(false);
        toast.error(errorMessage(e));
      },
    }),
  );

  function patch(values: Partial<Draft>) {
    setDraft((d) => (d ? { ...d, ...values } : d));
  }
  function patchItem(index: number, values: Partial<CatalogItem>) {
    setDraft((d) =>
      d ? { ...d, catalog: d.catalog.map((c, i) => (i === index ? { ...c, ...values } : c)) } : d,
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const keywords = keywordsText
      .split(/[\n,;]/)
      .map((k) => k.trim())
      .filter((k) => k.length >= 2);
    const key = draft.isNew ? draft.key || slugify(draft.label).slice(0, 40) : draft.key;
    patch({ key, keywords });
    save.mutate({
      ...draft,
      key,
      keywords,
      catalog: draft.catalog.filter((c) => c.name.trim()),
    });
  }

  const isGeneral = draft?.key === GENERAL_TRADE_KEY;

  return (
    <>
      <PageHeader
        title="Corps de métier"
        description="Ce que le logiciel prépare pour chaque métier : reconnaissance à partir de la description, modules conseillés, catalogue de prestations, mentions des devis et consignes de l'assistant IA. Les espaces existants gardent leur catalogue ; l'assistant suit immédiatement."
        actions={
          <Button variant="secondary" onClick={() => open({ ...EMPTY })}>
            <PlusIcon /> Nouveau métier
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <nav aria-label="Métiers" className="space-y-1">
          {list.isPending ? (
            Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-12" />)
          ) : list.isError ? (
            <p className="text-sm text-destructive">{errorMessage(list.error)}</p>
          ) : (
            list.data.map((p) => {
              const Icon = TRADE_ICONS[p.key] ?? TRADE_ICONS.multiservice!;
              const selected = draft && !draft.isNew && draft.key === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => open(toDraft(p))}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent",
                    selected && "bg-accent",
                    !p.active && "opacity-60",
                  )}
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {p.organizations} espace{p.organizations > 1 ? "s" : ""}
                      {p.key === GENERAL_TRADE_KEY ? " · base neutre" : ""}
                    </span>
                  </span>
                  {!p.active ? <Badge variant="neutral">Désactivé</Badge> : null}
                  {p.customized && p.builtin ? <Badge variant="outline">Modifié</Badge> : null}
                  {!p.builtin ? <Badge variant="outline">Ajouté</Badge> : null}
                </button>
              );
            })
          )}
        </nav>

        {draft ? (
          <form onSubmit={submit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{draft.isNew ? "Nouveau métier" : draft.label}</CardTitle>
                <CardDescription>
                  {isGeneral
                    ? "Base de départ des entreprises dont le métier n'est pas reconnu (« Autre activité »). Elles choisissent ensuite leurs modules."
                    : "Nom et description affichés sur la carte du métier, à l'accueil et dans les réglages."}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="trade-label">Nom</Label>
                  <Input
                    id="trade-label"
                    value={draft.label}
                    onChange={(e) => patch({ label: e.target.value })}
                    maxLength={60}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="trade-key">Identifiant</Label>
                  <Input
                    id="trade-key"
                    value={draft.key}
                    onChange={(e) => patch({ key: e.target.value.toLowerCase() })}
                    placeholder={draft.isNew ? slugify(draft.label || "auto-ecole") : undefined}
                    disabled={!draft.isNew}
                    maxLength={40}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="trade-hint">Description courte</Label>
                  <Input
                    id="trade-hint"
                    value={draft.hint}
                    onChange={(e) => patch({ hint: e.target.value })}
                    placeholder="Ex. : Permis B, code, conduite accompagnée"
                    maxLength={120}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="trade-industry">Secteur d'activité</Label>
                  <Select value={draft.industry} onValueChange={(v) => patch({ industry: v })}>
                    <SelectTrigger id="trade-industry">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((i) => (
                        <SelectItem key={i.value} value={i.value}>
                          {i.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="trade-position">Ordre d'affichage</Label>
                  <Input
                    id="trade-position"
                    type="number"
                    min={0}
                    max={10000}
                    value={draft.position}
                    onChange={(e) => patch({ position: Number(e.target.value) || 0 })}
                  />
                </div>
                {!isGeneral ? (
                  <label className="flex items-center gap-3 text-sm sm:col-span-2">
                    <Switch checked={draft.active} onCheckedChange={(v) => patch({ active: v })} />
                    Proposé aux entreprises (sinon caché ; les espaces qui l'ont gardent leurs
                    réglages)
                  </label>
                ) : null}
              </CardContent>
            </Card>

            {!isGeneral ? (
              <Card>
                <CardHeader>
                  <CardTitle>Reconnaissance</CardTitle>
                  <CardDescription>
                    Mots qui désignent ce métier quand l'entreprise décrit son activité (« plombier
                    à Toulouse »). Un par ligne ; accents, majuscules et pluriels sont ignorés.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    aria-label="Mots reconnus"
                    rows={6}
                    value={keywordsText}
                    onChange={(e) => setKeywordsText(e.target.value)}
                    placeholder={"auto-école\nmoniteur\npermis de conduire"}
                  />
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>Modules conseillés</CardTitle>
                <CardDescription>
                  Cochés d'office à l'accueil ; l'entreprise peut en ajouter ou en retirer.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-3">
                {MODULE_KEYS.map((m) => (
                  <label key={m} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={draft.modules.includes(m)}
                      onCheckedChange={(v) =>
                        patch({
                          modules: v
                            ? [...draft.modules, m]
                            : draft.modules.filter((x): x is ModuleKey => x !== m),
                        })
                      }
                    />
                    {MODULES[m].name}
                  </label>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Catalogue de prestations</CardTitle>
                <CardDescription>
                  Ajouté au catalogue de l'entreprise (sans doublon de nom). Prix HT indicatifs, à
                  ajuster par l'entreprise.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {draft.catalog.length > 0 ? (
                  <div className="grid grid-cols-[1fr_110px_100px_90px_140px_36px] gap-2 text-xs text-muted-foreground">
                    <span>Prestation</span>
                    <span>Unité</span>
                    <span>Prix HT (€)</span>
                    <span>TVA</span>
                    <span>Catégorie</span>
                    <span />
                  </div>
                ) : null}
                {draft.catalog.map((item, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_110px_100px_90px_140px_36px] items-center gap-2"
                  >
                    <Input
                      aria-label="Prestation"
                      value={item.name}
                      onChange={(e) => patchItem(i, { name: e.target.value })}
                      maxLength={120}
                    />
                    <Select
                      value={item.unit}
                      onValueChange={(v) => patchItem(i, { unit: v as CatalogItem["unit"] })}
                    >
                      <SelectTrigger aria-label="Unité">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATALOG_UNITS.map((u) => (
                          <SelectItem key={u} value={u}>
                            {UNIT_LABELS[u]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      aria-label="Prix HT"
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => patchItem(i, { unitPrice: Number(e.target.value) || 0 })}
                    />
                    <Select
                      value={item.vatRate}
                      onValueChange={(v) => patchItem(i, { vatRate: v as CatalogItem["vatRate"] })}
                    >
                      <SelectTrigger aria-label="TVA">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATALOG_VAT_RATES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r.replace(".", ",")} %
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      aria-label="Catégorie"
                      value={item.category}
                      onChange={(e) => patchItem(i, { category: e.target.value })}
                      maxLength={60}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Retirer la prestation"
                      onClick={() => patch({ catalog: draft.catalog.filter((_, j) => j !== i) })}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    patch({
                      catalog: [
                        ...draft.catalog,
                        { name: "", unit: "unit", unitPrice: 0, vatRate: "20", category: "" },
                      ],
                    })
                  }
                >
                  <PlusIcon /> Ajouter une prestation
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Devis, factures et assistant</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center gap-3 text-sm">
                  <Switch
                    checked={draft.decennial}
                    onCheckedChange={(v) => patch({ decennial: v })}
                  />
                  Préparer la mention d'assurance décennale sur les devis et factures
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <Switch
                    checked={draft.renovationVat}
                    onCheckedChange={(v) => patch({ renovationVat: v })}
                  />
                  Ajouter la mention de TVA réduite des travaux (lignes à 10 % ou 5,5 %)
                </label>
                <div className="space-y-1.5">
                  <Label htmlFor="trade-assistant">Ce que l'assistant IA doit savoir</Label>
                  <Textarea
                    id="trade-assistant"
                    rows={8}
                    value={draft.assistant}
                    onChange={(e) => patch({ assistant: e.target.value })}
                    maxLength={6000}
                    placeholder="Vocabulaire, règles du métier, points à vérifier sur un devis…"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ajouté au contexte de chaque question posée par les entreprises de ce métier.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between gap-3">
              <div>
                {current?.customized && current.builtin ? (
                  <Button type="button" variant="secondary" onClick={() => setConfirmReset(true)}>
                    <RotateCcwIcon /> Revenir à la version d'origine
                  </Button>
                ) : current && !current.builtin ? (
                  <Button type="button" variant="secondary" onClick={() => setConfirmReset(true)}>
                    <Trash2Icon /> Supprimer ce métier
                  </Button>
                ) : null}
              </div>
              <Button type="submit" disabled={save.isPending || draft.label.trim().length < 2}>
                {save.isPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </form>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title={current?.builtin ? "Revenir à la version d'origine ?" : "Supprimer ce métier ?"}
        description={
          current?.builtin
            ? "Vos modifications de ce métier seront perdues. Les espaces existants ne changent pas."
            : "Possible seulement si aucun espace ne l'utilise ; sinon, désactivez-le."
        }
        confirmLabel={current?.builtin ? "Rétablir" : "Supprimer"}
        destructive={!current?.builtin}
        pending={reset.isPending}
        onConfirm={() => draft && reset.mutate({ key: draft.key })}
      />
    </>
  );
}
