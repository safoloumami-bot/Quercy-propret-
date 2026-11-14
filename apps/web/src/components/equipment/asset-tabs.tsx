"use client";

import { EQUIPMENT_STATUSES, type EntityKey, formatCents, recordPath } from "@quercy/core";
import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import { Callout } from "@quercy/ui/components/callout";
import { Checkbox } from "@quercy/ui/components/checkbox";
import { Input } from "@quercy/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@quercy/ui/components/select";
import { Skeleton } from "@quercy/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@quercy/ui/components/table";
import { toast } from "@quercy/ui/components/toaster";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, PackageCheckIcon, PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { FormField } from "@/components/form-field";
import { errorMessage, useTRPC } from "@/lib/trpc";

const NONE = "__none__";
const day = (d: Date | string) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const dayTime = (d: Date | string) =>
  new Date(d).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
const euros = (cents: number) => formatCents(cents);
const toCents = (v: string) => Math.round(Number(v.replace(",", ".")) * 100) || 0;

/** Liste déroulante d'options (membres ou fiches) de l'espace. */
function OptionSelect({
  kind,
  value,
  onChange,
  label,
  placeholder = "Aucun",
}: {
  kind: "user" | EntityKey;
  value: string | null;
  onChange: (v: string | null) => void;
  label: string;
  placeholder?: string;
}) {
  const trpc = useTRPC();
  const options = useQuery({ ...trpc.records.options.queryOptions({ kind }), staleTime: 60_000 });
  return (
    <Select value={value ?? NONE} onValueChange={(v) => onChange(v === NONE ? null : v)}>
      <SelectTrigger aria-label={label}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{placeholder}</SelectItem>
        {(options.data ?? []).map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Invalide toutes les requêtes : la fiche, ses listes et l'onglet se remettent à jour. */
function useRefreshAll() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries();
}

/* ----------------------------------------------------------- pannes et états */

function ReportsList({ vehicleId, equipmentId }: { vehicleId?: string; equipmentId?: string }) {
  const trpc = useTRPC();
  const refresh = useRefreshAll();
  const reports = useQuery(trpc.assets.reports.queryOptions({ vehicleId, equipmentId }));
  const [resolving, setResolving] = React.useState<{ id: string; text: string } | null>(null);
  const resolve = useMutation(
    trpc.assets.resolveReport.mutationOptions({
      onSuccess: () => {
        toast.success("Signalement clos.");
        setResolving(null);
        refresh();
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  if (reports.isPending) return <Skeleton className="h-16" />;
  if (reports.error) return <Callout variant="warning">{errorMessage(reports.error)}</Callout>;
  if (!reports.data.length)
    return (
      <p className="text-sm text-muted-foreground">
        Aucun état des lieux ni panne : l&apos;agent les saisit depuis l&apos;application terrain.
      </p>
    );
  return (
    <ul className="space-y-2">
      {reports.data.map((r) => (
        <li key={r.id} className="rounded-md border border-border p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={r.kind === "breakdown" ? "danger" : "info"}>
              {r.kind === "breakdown" ? "Panne" : "État des lieux"}
            </Badge>
            <span className="text-muted-foreground">
              {dayTime(r.createdAt)}
              {r.reportedBy ? ` · ${r.reportedBy}` : ""}
              {r.mileage ? ` · ${r.mileage.toLocaleString("fr-FR")} km` : ""}
            </span>
            {r.kind === "breakdown" ? (
              r.status === "open" ? (
                <Badge variant="warning" className="ml-auto">
                  À traiter
                </Badge>
              ) : (
                <Badge variant="success" className="ml-auto">
                  Réglée
                </Badge>
              )
            ) : null}
          </div>
          {r.note ? <p className="mt-1 whitespace-pre-line">{r.note}</p> : null}
          {r.photoUrl ? (
            <a href={r.photoUrl} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.photoUrl} alt="Photo jointe" className="mt-2 h-24 rounded-md border" />
            </a>
          ) : null}
          {r.resolution ? (
            <p className="mt-1 text-muted-foreground">
              Réglée{r.resolvedBy ? ` par ${r.resolvedBy}` : ""} : {r.resolution}
            </p>
          ) : null}
          {r.status === "open" ? (
            resolving?.id === r.id ? (
              <div className="mt-2 flex gap-2">
                <Input
                  autoFocus
                  aria-label="Ce qui a été fait"
                  placeholder="Ce qui a été fait (garage, pièce changée…)"
                  value={resolving.text}
                  onChange={(e) => setResolving({ id: r.id, text: e.target.value })}
                />
                <Button
                  size="sm"
                  disabled={!resolving.text.trim() || resolve.isPending}
                  onClick={() => resolve.mutate({ id: r.id, resolution: resolving.text })}
                >
                  Clore
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                className="mt-2"
                onClick={() => setResolving({ id: r.id, text: "" })}
              >
                <CheckIcon aria-hidden /> Marquer réglée
              </Button>
            )
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ matériel */

/** Matériel : déplacer / changer d'état, journal des mouvements, locations, pannes. */
export function EquipmentTab({ equipmentId }: { equipmentId: string }) {
  const trpc = useTRPC();
  const refresh = useRefreshAll();
  const history = useQuery(trpc.assets.equipmentHistory.queryOptions({ equipmentId }));
  const [move, setMove] = React.useState<{
    status: string;
    assignedUserId: string | null;
    siteId: string | null;
    warehouseId: string | null;
    note: string;
  } | null>(null);
  const save = useMutation(
    trpc.assets.moveEquipment.mutationOptions({
      onSuccess: () => {
        toast.success("Mouvement enregistré.");
        setMove(null);
        refresh();
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  if (history.isPending) return <Skeleton className="h-24" />;
  if (history.error) return <Callout variant="warning">{errorMessage(history.error)}</Callout>;
  const h = history.data;
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Mouvements</h3>
          {!move ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                setMove({
                  status: h.status,
                  assignedUserId: h.assignedUserId,
                  siteId: h.siteId,
                  warehouseId: h.warehouseId,
                  note: "",
                })
              }
            >
              Déplacer / changer d&apos;état
            </Button>
          ) : null}
        </div>
        {move ? (
          <div className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-2">
            <FormField id="move-status" label="État">
              <Select value={move.status} onValueChange={(status) => setMove({ ...move, status })}>
                <SelectTrigger id="move-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField id="move-user" label="Salarié">
              <OptionSelect
                kind="user"
                label="Salarié"
                value={move.assignedUserId}
                onChange={(assignedUserId) => setMove({ ...move, assignedUserId })}
              />
            </FormField>
            <FormField id="move-site" label="Site / chantier">
              <OptionSelect
                kind="site"
                label="Site"
                value={move.siteId}
                onChange={(siteId) => setMove({ ...move, siteId })}
              />
            </FormField>
            <FormField id="move-warehouse" label="Dépôt">
              <OptionSelect
                kind="warehouse"
                label="Dépôt"
                value={move.warehouseId}
                onChange={(warehouseId) => setMove({ ...move, warehouseId })}
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField id="move-note" label="Note (facultatif)">
                <Input
                  id="move-note"
                  value={move.note}
                  onChange={(e) => setMove({ ...move, note: e.target.value })}
                />
              </FormField>
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button variant="secondary" onClick={() => setMove(null)}>
                Annuler
              </Button>
              <Button
                disabled={save.isPending}
                onClick={() =>
                  save.mutate({
                    equipmentId,
                    status: move.status,
                    assignedUserId: move.assignedUserId,
                    siteId: move.siteId,
                    warehouseId: move.warehouseId,
                    note: move.note || undefined,
                  })
                }
              >
                Enregistrer
              </Button>
            </div>
          </div>
        ) : null}
        {h.movements.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>État</TableHead>
                <TableHead>Où / qui</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {h.movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap">{dayTime(m.at)}</TableCell>
                  <TableCell>{m.statusLabel}</TableCell>
                  <TableCell>{m.location}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {[m.note, m.by].filter(Boolean).join(" · ")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun mouvement.</p>
        )}
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-medium">Locations</h3>
        {h.rentals.length ? (
          <ul className="space-y-1 text-sm">
            {h.rentals.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2">
                <Link className="font-medium hover:underline" href={recordPath("rental", r.id)}>
                  {r.reference ?? "Location"}
                </Link>
                <span className="text-muted-foreground">
                  {day(r.startDate)} → {day(r.endDate)}
                  {r.company ? ` · ${r.company}` : ""}
                </span>
                {r.invoiced ? <Badge variant="success">Facturée</Badge> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Jamais loué.</p>
        )}
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-medium">Pannes signalées</h3>
        <ReportsList equipmentId={equipmentId} />
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ véhicule */

/** Véhicule : échéances à surveiller, états des lieux et pannes venus du terrain. */
export function VehicleTab({ vehicleId }: { vehicleId: string }) {
  const trpc = useTRPC();
  const dues = useQuery(trpc.assets.vehicleDues.queryOptions({ vehicleId }));
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="text-sm font-medium">Échéances (30 jours)</h3>
        {dues.isPending ? (
          <Skeleton className="h-10" />
        ) : dues.data?.length ? (
          <ul className="space-y-1 text-sm">
            {dues.data.map((d) => (
              <li key={d.key} className="flex items-center gap-2">
                <Badge variant={d.overdue ? "danger" : "warning"}>
                  {d.overdue ? "Dépassé" : "Bientôt"}
                </Badge>
                {d.label}
                {d.date ? <span className="text-muted-foreground">· {day(d.date)}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Rien à prévoir dans les 30 jours.</p>
        )}
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-medium">États des lieux et pannes</h3>
        <ReportsList vehicleId={vehicleId} />
      </section>
    </div>
  );
}

/* --------------------------------------------------------- stock d'un article */

const LOCATION_KINDS = [
  { value: "warehouse", label: "Dépôt", kind: "warehouse" },
  { value: "vehicle", label: "Véhicule", kind: "vehicle" },
  { value: "holder", label: "Salarié", kind: "user" },
  { value: "site", label: "Site", kind: "site" },
  { value: "none", label: "Non localisé", kind: null },
] as const;
type LocationKind = (typeof LOCATION_KINDS)[number]["value"];

function LocationPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: { kind: LocationKind; id: string | null };
  onChange: (v: { kind: LocationKind; id: string | null }) => void;
}) {
  const option = LOCATION_KINDS.find((k) => k.value === value.kind)!;
  return (
    <div className="space-y-2">
      <Select
        value={value.kind}
        onValueChange={(kind) => onChange({ kind: kind as LocationKind, id: null })}
      >
        <SelectTrigger aria-label={`${label} : type d'emplacement`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LOCATION_KINDS.map((k) => (
            <SelectItem key={k.value} value={k.value}>
              {k.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {option.kind ? (
        <OptionSelect
          kind={option.kind}
          label={label}
          value={value.id}
          placeholder="Choisir…"
          onChange={(id) => onChange({ ...value, id })}
        />
      ) : null}
    </div>
  );
}

/** Article : stock par emplacement (dépôt, véhicule, salarié, site) et transfert. */
export function ProductStockTab({ productId }: { productId: string }) {
  const trpc = useTRPC();
  const refresh = useRefreshAll();
  const stock = useQuery(trpc.assets.stockByLocation.queryOptions({ productId }));
  const [transfer, setTransfer] = React.useState<{
    from: { kind: LocationKind; id: string | null };
    to: { kind: LocationKind; id: string | null };
    quantity: string;
  } | null>(null);
  const save = useMutation(
    trpc.assets.transferStock.mutationOptions({
      onSuccess: () => {
        toast.success("Transfert enregistré.");
        setTransfer(null);
        refresh();
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  if (stock.isPending) return <Skeleton className="h-16" />;
  if (stock.error) return <Callout variant="warning">{errorMessage(stock.error)}</Callout>;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Stock par emplacement</h3>
        {!transfer ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setTransfer({
                from: { kind: "warehouse", id: null },
                to: { kind: "vehicle", id: null },
                quantity: "1",
              })
            }
          >
            Transférer
          </Button>
        ) : null}
      </div>
      {stock.data.length ? (
        <ul className="space-y-1 text-sm">
          {stock.data.map((l) => (
            <li key={`${l.kind}:${l.id}`} className="flex justify-between gap-2">
              <span>{l.label}</span>
              <span className={l.quantity < 0 ? "text-destructive-text" : "font-medium"}>
                {l.quantity.toLocaleString("fr-FR")}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Aucun mouvement de stock.</p>
      )}
      {transfer ? (
        <div className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-3">
          <FormField id="tr-from" label="De">
            <LocationPicker
              label="De"
              value={transfer.from}
              onChange={(from) => setTransfer({ ...transfer, from })}
            />
          </FormField>
          <FormField id="tr-to" label="Vers">
            <LocationPicker
              label="Vers"
              value={transfer.to}
              onChange={(to) => setTransfer({ ...transfer, to })}
            />
          </FormField>
          <FormField id="tr-qty" label="Quantité">
            <Input
              id="tr-qty"
              inputMode="decimal"
              value={transfer.quantity}
              onChange={(e) => setTransfer({ ...transfer, quantity: e.target.value })}
            />
          </FormField>
          <div className="flex justify-end gap-2 sm:col-span-3">
            <Button variant="secondary" onClick={() => setTransfer(null)}>
              Annuler
            </Button>
            <Button
              disabled={save.isPending}
              onClick={() =>
                save.mutate({
                  productId,
                  quantity: Number(transfer.quantity.replace(",", ".")) || 0,
                  from: transfer.from,
                  to: transfer.to,
                })
              }
            >
              Transférer
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------ commande fournisseur */

interface LineDraft {
  productId: string | null;
  label: string;
  quantity: string;
  unitPrice: string;
}

/** Commande fournisseur : lignes (tarifs du fournisseur proposés) et réception. */
export function PurchaseLinesTab({ purchaseOrderId }: { purchaseOrderId: string }) {
  const trpc = useTRPC();
  const refresh = useRefreshAll();
  const data = useQuery(trpc.assets.purchaseLines.queryOptions({ purchaseOrderId }));
  const [lines, setLines] = React.useState<LineDraft[] | null>(null);
  const [receive, setReceive] = React.useState<Record<string, string> | null>(null);
  const [warehouseId, setWarehouseId] = React.useState<string | null>(null);
  const save = useMutation(
    trpc.assets.savePurchaseLines.mutationOptions({
      onSuccess: (r) => {
        toast.success(`Lignes enregistrées (total HT ${euros(r.totalExclCents)}).`);
        setLines(null);
        refresh();
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  const doReceive = useMutation(
    trpc.assets.receivePurchase.mutationOptions({
      onSuccess: (r) => {
        toast.success(
          r.status === "received" ? "Commande reçue en totalité." : "Réception partielle notée.",
        );
        setReceive(null);
        refresh();
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  if (data.isPending) return <Skeleton className="h-24" />;
  if (data.error) return <Callout variant="warning">{errorMessage(data.error)}</Callout>;
  const d = data.data;
  const anyReceived = d.lines.some((l) => l.receivedQuantity > 0);
  const remaining = d.lines.filter((l) => l.receivedQuantity < l.quantity);

  if (lines)
    return (
      <div className="space-y-3">
        {lines.map((l, i) => {
          const set = (patch: Partial<LineDraft>) =>
            setLines(lines.map((x, k) => (k === i ? { ...x, ...patch } : x)));
          return (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_6rem_7rem_auto]">
              <Input
                aria-label="Désignation"
                placeholder="Désignation"
                value={l.label}
                onChange={(e) => set({ label: e.target.value })}
              />
              <Input
                aria-label="Quantité"
                inputMode="decimal"
                value={l.quantity}
                onChange={(e) => set({ quantity: e.target.value })}
              />
              <Input
                aria-label="Prix unitaire HT (€)"
                inputMode="decimal"
                value={l.unitPrice}
                onChange={(e) => set({ unitPrice: e.target.value })}
              />
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Retirer la ligne"
                onClick={() => setLines(lines.filter((_, k) => k !== i))}
              >
                <Trash2Icon />
              </Button>
            </div>
          );
        })}
        <div className="flex flex-wrap gap-2">
          <Select
            value=""
            onValueChange={(productId) => {
              const p = d.supplierPrices.find((x) => x.productId === productId);
              if (!p) return;
              setLines([
                ...lines,
                {
                  productId,
                  label: p.name,
                  quantity: "1",
                  unitPrice: String(p.priceCents / 100),
                },
              ]);
            }}
          >
            <SelectTrigger className="w-64" aria-label="Ajouter un article du fournisseur">
              <SelectValue
                placeholder={
                  d.supplierPrices.length ? "Article du fournisseur" : "Aucun tarif fournisseur"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {d.supplierPrices.map((p) => (
                <SelectItem key={p.productId} value={p.productId}>
                  {p.name} · {euros(p.priceCents)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="secondary"
            onClick={() =>
              setLines([...lines, { productId: null, label: "", quantity: "1", unitPrice: "0" }])
            }
          >
            <PlusIcon aria-hidden /> Ligne libre
          </Button>
          <span className="ml-auto flex gap-2">
            <Button variant="secondary" onClick={() => setLines(null)}>
              Annuler
            </Button>
            <Button
              disabled={save.isPending}
              onClick={() =>
                save.mutate({
                  purchaseOrderId,
                  lines: lines.map((l) => ({
                    productId: l.productId,
                    label: l.label,
                    quantity: Number(l.quantity.replace(",", ".")) || 0,
                    unitPriceCents: toCents(l.unitPrice),
                  })),
                })
              }
            >
              Enregistrer
            </Button>
          </span>
        </div>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-auto text-sm font-medium">
          Lignes · total HT {euros(d.totalExclCents ?? 0)}
        </h3>
        {!anyReceived && d.lines.length ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setLines(
                d.lines.map((l) => ({
                  productId: l.productId,
                  label: l.label,
                  quantity: String(l.quantity),
                  unitPrice: String(l.unitPriceCents / 100),
                })),
              )
            }
          >
            Modifier les lignes
          </Button>
        ) : null}
        {remaining.length && !receive && d.status !== "cancelled" ? (
          <Button
            size="sm"
            onClick={() =>
              setReceive(
                Object.fromEntries(
                  remaining.map((l) => [l.id, String(l.quantity - l.receivedQuantity)]),
                ),
              )
            }
          >
            <PackageCheckIcon aria-hidden /> Réceptionner
          </Button>
        ) : null}
      </div>
      {d.lines.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Désignation</TableHead>
              <TableHead className="text-right">Qté</TableHead>
              <TableHead className="text-right">PU HT</TableHead>
              <TableHead className="text-right">Reçu</TableHead>
              {receive ? <TableHead className="text-right">À recevoir</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {d.lines.map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  {l.label}
                  {!l.productId ? (
                    <span className="text-xs text-muted-foreground"> (hors stock)</span>
                  ) : null}
                </TableCell>
                <TableCell className="text-right">{l.quantity}</TableCell>
                <TableCell className="text-right">{euros(l.unitPriceCents)}</TableCell>
                <TableCell className="text-right">{l.receivedQuantity}</TableCell>
                {receive ? (
                  <TableCell className="text-right">
                    {l.id in receive ? (
                      <Input
                        className="ml-auto w-20"
                        inputMode="decimal"
                        aria-label={`Quantité reçue : ${l.label}`}
                        value={receive[l.id]}
                        onChange={(e) => setReceive({ ...receive, [l.id]: e.target.value })}
                      />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground">
          Pas encore de ligne : ajoutez les articles commandés.
        </p>
      )}
      {!d.lines.length && !anyReceived ? (
        <Button size="sm" variant="secondary" onClick={() => setLines([])}>
          <PlusIcon aria-hidden /> Ajouter des lignes
        </Button>
      ) : null}
      {receive ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-64">
            <FormField id="rcv-warehouse" label="Entrée au dépôt">
              <OptionSelect
                kind="warehouse"
                label="Dépôt"
                placeholder="Non localisé"
                value={warehouseId}
                onChange={setWarehouseId}
              />
            </FormField>
          </div>
          <span className="ml-auto flex gap-2">
            <Button variant="secondary" onClick={() => setReceive(null)}>
              Annuler
            </Button>
            <Button
              disabled={doReceive.isPending}
              onClick={() =>
                doReceive.mutate({
                  purchaseOrderId,
                  warehouseId,
                  lines: Object.entries(receive)
                    .map(([lineId, q]) => ({ lineId, quantity: Number(q.replace(",", ".")) }))
                    .filter((l) => l.quantity > 0),
                })
              }
            >
              Valider la réception
            </Button>
          </span>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- fournisseur */

/** Fournisseur : ses tarifs par article (utilisés pour les commandes). */
export function SupplierPricesTab({ supplierId }: { supplierId: string }) {
  const trpc = useTRPC();
  const refresh = useRefreshAll();
  const prices = useQuery(trpc.assets.supplierPrices.queryOptions({ supplierId }));
  const [draft, setDraft] = React.useState<{
    productId: string | null;
    price: string;
    ref: string;
  } | null>(null);
  const save = useMutation(
    trpc.assets.saveSupplierPrice.mutationOptions({
      onSuccess: () => {
        toast.success("Tarif enregistré.");
        setDraft(null);
        refresh();
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  const remove = useMutation(
    trpc.assets.removeSupplierPrice.mutationOptions({
      onSuccess: refresh,
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  if (prices.isPending) return <Skeleton className="h-16" />;
  if (prices.error) return <Callout variant="warning">{errorMessage(prices.error)}</Callout>;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Tarifs</h3>
        {!draft ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setDraft({ productId: null, price: "", ref: "" })}
          >
            <PlusIcon aria-hidden /> Ajouter un tarif
          </Button>
        ) : null}
      </div>
      {prices.data.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Article</TableHead>
              <TableHead>Réf. fournisseur</TableHead>
              <TableHead className="text-right">Prix HT</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {prices.data.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.product.name}</TableCell>
                <TableCell className="text-muted-foreground">{p.supplierRef ?? ""}</TableCell>
                <TableCell className="text-right">{euros(p.priceCents)}</TableCell>
                <TableCell className="w-10">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Retirer le tarif de ${p.product.name}`}
                    onClick={() => remove.mutate({ id: p.id })}
                  >
                    <Trash2Icon />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground">Aucun tarif enregistré.</p>
      )}
      {draft ? (
        <div className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-3">
          <FormField id="sp-product" label="Article">
            <OptionSelect
              kind="product"
              label="Article"
              placeholder="Choisir…"
              value={draft.productId}
              onChange={(productId) => setDraft({ ...draft, productId })}
            />
          </FormField>
          <FormField id="sp-price" label="Prix HT (€)">
            <Input
              id="sp-price"
              inputMode="decimal"
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: e.target.value })}
            />
          </FormField>
          <FormField id="sp-ref" label="Réf. fournisseur">
            <Input
              id="sp-ref"
              value={draft.ref}
              onChange={(e) => setDraft({ ...draft, ref: e.target.value })}
            />
          </FormField>
          <div className="flex justify-end gap-2 sm:col-span-3">
            <Button variant="secondary" onClick={() => setDraft(null)}>
              Annuler
            </Button>
            <Button
              disabled={!draft.productId || save.isPending}
              onClick={() =>
                draft.productId &&
                save.mutate({
                  supplierId,
                  productId: draft.productId,
                  priceCents: toCents(draft.price),
                  supplierRef: draft.ref || undefined,
                })
              }
            >
              Enregistrer
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------- location */

/** Location : montant, sortie, retour (caution) et facture. */
export function RentalTab({ rentalId }: { rentalId: string }) {
  const trpc = useTRPC();
  const refresh = useRefreshAll();
  const rental = useQuery(trpc.assets.rental.queryOptions({ rentalId }));
  const [deposit, setDeposit] = React.useState(true);
  const status = useMutation(
    trpc.assets.setRentalStatus.mutationOptions({
      onSuccess: refresh,
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  const invoice = useMutation(
    trpc.assets.invoiceRental.mutationOptions({
      onSuccess: () => {
        toast.success("Facture brouillon créée.");
        refresh();
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  if (rental.isPending) return <Skeleton className="h-16" />;
  if (rental.error) return <Callout variant="warning">{errorMessage(rental.error)}</Callout>;
  const r = rental.data;
  return (
    <div className="space-y-4 text-sm">
      <p>
        {r.periods} {r.periodLabel} → <span className="font-medium">{euros(r.amountCents)} HT</span>
        {r.depositCents ? ` · caution ${euros(r.depositCents)}` : ""}
      </p>
      <p className="text-muted-foreground">
        {r.outAt ? `Sorti le ${dayTime(r.outAt)}. ` : ""}
        {r.returnedAt ? `Rendu le ${dayTime(r.returnedAt)}. ` : ""}
        {r.depositCents && r.status === "returned"
          ? r.depositReturned
            ? "Caution rendue."
            : "Caution conservée."
          : ""}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {r.status === "reserved" ? (
          <Button
            disabled={status.isPending}
            onClick={() => status.mutate({ rentalId, status: "out" })}
          >
            Sortie du matériel
          </Button>
        ) : null}
        {r.status === "out" ? (
          <>
            {r.depositCents ? (
              <label className="flex items-center gap-2">
                <Checkbox checked={deposit} onCheckedChange={(v) => setDeposit(v === true)} />
                Caution rendue
              </label>
            ) : null}
            <Button
              disabled={status.isPending}
              onClick={() =>
                status.mutate({
                  rentalId,
                  status: "returned",
                  depositReturned: r.depositCents ? deposit : undefined,
                })
              }
            >
              Retour du matériel
            </Button>
          </>
        ) : null}
        {r.status === "reserved" ? (
          <Button
            variant="secondary"
            disabled={status.isPending}
            onClick={() => {
              if (confirm("Annuler cette location ?"))
                status.mutate({ rentalId, status: "cancelled" });
            }}
          >
            Annuler la location
          </Button>
        ) : null}
        {r.invoice ? (
          <Button asChild variant="secondary">
            <Link href={recordPath("invoice", r.invoice.id)}>
              Facture {r.invoice.number ?? "(brouillon)"}
            </Link>
          </Button>
        ) : r.status !== "cancelled" ? (
          <Button
            variant="secondary"
            disabled={invoice.isPending}
            onClick={() => invoice.mutate({ rentalId })}
          >
            Facturer
          </Button>
        ) : null}
      </div>
    </div>
  );
}
