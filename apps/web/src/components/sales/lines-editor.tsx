"use client";

import { PRODUCT_UNITS, VAT_RATES, computeTotals, formatCents, lineTotalCents } from "@quercy/core";
import { Button } from "@quercy/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@quercy/ui/components/command";
import { Input } from "@quercy/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@quercy/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@quercy/ui/components/select";
import { Textarea } from "@quercy/ui/components/textarea";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownIcon, ArrowUpIcon, PackageSearchIcon, PlusIcon, Trash2Icon } from "lucide-react";
import * as React from "react";

import { useTRPC } from "@/lib/trpc";

export interface EditableLine {
  key: string;
  productId: string | null;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  discountPercent: string;
  vatRate: string;
}

const NO_UNIT = "__none__";

export function toNumber(value: string): number {
  const n = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : Number.NaN;
}

function euros(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

let counter = 0;
export function newLine(partial: Partial<EditableLine> = {}): EditableLine {
  counter += 1;
  return {
    key: `l${Date.now()}${counter}`,
    productId: null,
    description: "",
    quantity: "1",
    unit: "unit",
    unitPrice: "0,00",
    discountPercent: "0",
    vatRate: "20",
    ...partial,
  };
}

export function fromServer(
  lines: {
    productId: string | null;
    description: string;
    quantity: number;
    unit: string | null;
    unitPriceCents: number;
    discountPercent: number;
    vatRate: number;
  }[],
): EditableLine[] {
  return lines.map((l) =>
    newLine({
      productId: l.productId,
      description: l.description,
      quantity: String(l.quantity).replace(".", ","),
      unit: l.unit ?? NO_UNIT,
      unitPrice: euros(l.unitPriceCents),
      discountPercent: String(l.discountPercent).replace(".", ","),
      vatRate: String(l.vatRate),
    }),
  );
}

/** Lignes saisies → lignes envoyées au serveur, ou message d'erreur (ligne n°). */
export function toPayload(lines: EditableLine[]) {
  const out = [];
  for (const [index, l] of lines.entries()) {
    const quantity = toNumber(l.quantity);
    const unitPrice = toNumber(l.unitPrice);
    const discount = toNumber(l.discountPercent || "0");
    const vat = toNumber(l.vatRate);
    const n = index + 1;
    if (!l.description.trim()) return { error: `Ligne ${n} : la désignation est obligatoire.` };
    if (!Number.isFinite(quantity) || quantity === 0)
      return { error: `Ligne ${n} : quantité invalide.` };
    if (!Number.isFinite(unitPrice)) return { error: `Ligne ${n} : prix unitaire invalide.` };
    if (!Number.isFinite(discount) || discount < 0 || discount > 100)
      return { error: `Ligne ${n} : remise entre 0 et 100 %.` };
    out.push({
      productId: l.productId,
      description: l.description.trim(),
      quantity,
      unit: l.unit === NO_UNIT ? null : l.unit,
      unitPriceCents: Math.round(unitPrice * 100),
      discountPercent: discount,
      vatRate: vat,
    });
  }
  return { lines: out };
}

function ProductPicker({ onPick }: { onPick: (p: ProductOption) => void }) {
  const trpc = useTRPC();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const catalog = useQuery({
    ...trpc.sales.catalog.queryOptions({ search: search || undefined }),
    enabled: open,
  });
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Choisir un article du catalogue">
          <PackageSearchIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Rechercher un article…"
          />
          <CommandList className="max-h-64">
            <CommandEmpty>{catalog.isPending ? "Recherche…" : "Aucun article actif."}</CommandEmpty>
            <CommandGroup>
              {(catalog.data ?? []).map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.id}
                  onSelect={() => {
                    onPick(p);
                    setOpen(false);
                  }}
                >
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatCents(p.unitPriceCents)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface ProductOption {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  unitPriceCents: number;
  vatRate: number;
}

/**
 * Saisie des lignes d'un document : article du catalogue ou ligne libre, quantité, unité,
 * prix HT, remise, TVA ; totaux recalculés en direct (le serveur fait foi à l'enregistrement).
 */
export function LinesEditor({
  lines,
  onChange,
  vatExempt,
}: {
  lines: EditableLine[];
  onChange: (lines: EditableLine[]) => void;
  vatExempt: boolean;
}) {
  const update = (key: string, patch: Partial<EditableLine>) =>
    onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const move = (index: number, delta: number) => {
    const next = [...lines];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item!);
    onChange(next);
  };
  const parsed = lines.map((l) => ({
    quantity: toNumber(l.quantity) || 0,
    unitPriceCents: Math.round((toNumber(l.unitPrice) || 0) * 100),
    discountPercent: toNumber(l.discountPercent || "0") || 0,
    vatRate: toNumber(l.vatRate) || 0,
  }));
  const totals = computeTotals(parsed, { vatExempt });

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-muted text-xs text-muted-foreground">
            <tr>
              <th className="w-10" />
              <th className="px-2 py-2 text-left font-medium">Désignation</th>
              <th className="w-24 px-2 py-2 text-right font-medium">Qté</th>
              <th className="w-28 px-2 py-2 text-left font-medium">Unité</th>
              <th className="w-32 px-2 py-2 text-right font-medium">PU HT (€)</th>
              <th className="w-24 px-2 py-2 text-right font-medium">Remise %</th>
              <th className="w-24 px-2 py-2 text-left font-medium">TVA</th>
              <th className="w-32 px-2 py-2 text-right font-medium">Total HT</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={line.key} className="border-t border-border align-top">
                <td className="px-1 py-2">
                  <ProductPicker
                    onPick={(p) =>
                      update(line.key, {
                        productId: p.id,
                        description: p.description ? `${p.name}\n${p.description}` : p.name,
                        unit: p.unit,
                        unitPrice: euros(p.unitPriceCents),
                        vatRate: String(p.vatRate),
                      })
                    }
                  />
                </td>
                <td className="px-2 py-2">
                  <Textarea
                    value={line.description}
                    onChange={(e) => update(line.key, { description: e.target.value })}
                    rows={Math.min(4, Math.max(1, line.description.split("\n").length))}
                    className="min-h-8 resize-y py-1.5"
                    aria-label={`Désignation, ligne ${index + 1}`}
                    placeholder="Désignation de la prestation ou du produit"
                  />
                </td>
                <td className="px-2 py-2">
                  <Input
                    value={line.quantity}
                    onChange={(e) => update(line.key, { quantity: e.target.value })}
                    inputMode="decimal"
                    className="h-8 text-right tabular-nums"
                    aria-label={`Quantité, ligne ${index + 1}`}
                  />
                </td>
                <td className="px-2 py-2">
                  <Select value={line.unit} onValueChange={(unit) => update(line.key, { unit })}>
                    <SelectTrigger className="h-8" aria-label={`Unité, ligne ${index + 1}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_UNIT}>—</SelectItem>
                      {PRODUCT_UNITS.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-2 py-2">
                  <Input
                    value={line.unitPrice}
                    onChange={(e) => update(line.key, { unitPrice: e.target.value })}
                    inputMode="decimal"
                    className="h-8 text-right tabular-nums"
                    aria-label={`Prix unitaire HT, ligne ${index + 1}`}
                  />
                </td>
                <td className="px-2 py-2">
                  <Input
                    value={line.discountPercent}
                    onChange={(e) => update(line.key, { discountPercent: e.target.value })}
                    inputMode="decimal"
                    className="h-8 text-right tabular-nums"
                    aria-label={`Remise, ligne ${index + 1}`}
                  />
                </td>
                <td className="px-2 py-2">
                  <Select
                    value={line.vatRate}
                    onValueChange={(vatRate) => update(line.key, { vatRate })}
                    disabled={vatExempt}
                  >
                    <SelectTrigger className="h-8" aria-label={`TVA, ligne ${index + 1}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VAT_RATES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-2 py-3 text-right tabular-nums">
                  {formatCents(lineTotalCents(parsed[index]!))}
                </td>
                <td className="px-1 py-2">
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      aria-label={`Monter la ligne ${index + 1}`}
                    >
                      <ArrowUpIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={index === lines.length - 1}
                      onClick={() => move(index, 1)}
                      aria-label={`Descendre la ligne ${index + 1}`}
                    >
                      <ArrowDownIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onChange(lines.filter((l) => l.key !== line.key))}
                      aria-label={`Supprimer la ligne ${index + 1}`}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-start justify-between gap-6">
        <Button variant="secondary" size="sm" onClick={() => onChange([...lines, newLine()])}>
          <PlusIcon />
          Ajouter une ligne
        </Button>
        <Totals totals={totals} vatExempt={vatExempt} />
      </div>
    </div>
  );
}

export function Totals({
  totals,
  vatExempt,
  paidCents,
  dueCents,
}: {
  totals: ReturnType<typeof computeTotals>;
  vatExempt: boolean;
  paidCents?: number;
  dueCents?: number;
}) {
  return (
    <dl className="w-72 space-y-1 text-sm" aria-label="Totaux">
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Total HT</dt>
        <dd className="tabular-nums">{formatCents(totals.totalExclCents)}</dd>
      </div>
      {vatExempt ? (
        <div className="flex justify-between">
          <dt className="text-muted-foreground">TVA (franchise)</dt>
          <dd className="tabular-nums">{formatCents(0)}</dd>
        </div>
      ) : (
        totals.vat.map((v) => (
          <div key={v.rate} className="flex justify-between">
            <dt className="text-muted-foreground">TVA {String(v.rate).replace(".", ",")} %</dt>
            <dd className="tabular-nums">{formatCents(v.taxCents)}</dd>
          </div>
        ))
      )}
      <div className="flex justify-between border-t border-border pt-1 font-semibold">
        <dt>Total TTC</dt>
        <dd className="tabular-nums">{formatCents(totals.totalCents)}</dd>
      </div>
      {paidCents !== undefined && paidCents > 0 ? (
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Encaissé</dt>
          <dd className="tabular-nums">{formatCents(paidCents)}</dd>
        </div>
      ) : null}
      {dueCents !== undefined && dueCents !== totals.totalCents ? (
        <div className="flex justify-between font-semibold">
          <dt>Reste dû</dt>
          <dd className="tabular-nums">{formatCents(Math.max(0, dueCents))}</dd>
        </div>
      ) : null}
    </dl>
  );
}
