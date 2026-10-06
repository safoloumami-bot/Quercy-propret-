"use client";

import { WEEKDAYS, computeEstimate, formatCents, recordPath, visitsPerMonthOf } from "@quercy/core";
import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import { Callout } from "@quercy/ui/components/callout";
import { Input } from "@quercy/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@quercy/ui/components/select";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { toast } from "@quercy/ui/components/toaster";
import { cn } from "@quercy/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import Link from "next/link";
import * as React from "react";

import { FormField } from "@/components/form-field";
import { errorMessage, useTRPC } from "@/lib/trpc";
import type { AppRouter } from "@/server/trpc/root";

type EstimateData = inferRouterOutputs<AppRouter>["estimates"]["get"];

const euros = (cents: number) => formatCents(cents);
const toCents = (v: string) => Math.round(Number(v.replace(",", ".")) * 100) || 0;
const num = (v: string) => Number(v.replace(",", ".")) || 0;
const fromCents = (c: number | null | undefined) => (c ? String(c / 100) : "");

interface Draft {
  kind: "one_off" | "recurring";
  people: string;
  hoursPerPerson: string;
  hourlyCost: string;
  km: string;
  kmCost: string;
  travelMinutes: string;
  products: string;
  equipment: string;
  rental: string;
  subcontract: string;
  other: string;
  targetMarginPct: string;
  price: string;
  weekdays: string[];
  startTime: string;
  startDate: string;
  endDate: string;
}

function draftOf(d: EstimateData): Draft {
  const e = d.estimate;
  return {
    kind: e.kind === "recurring" ? "recurring" : "one_off",
    people: String(e.people),
    hoursPerPerson: String(e.hoursPerPerson),
    hourlyCost: fromCents(e.hourlyCostCents || d.defaults.hourlyCostCents),
    km: e.km ? String(e.km) : "",
    kmCost: fromCents(e.kmCostCents || d.defaults.kmCostCents),
    travelMinutes: e.travelMinutes ? String(e.travelMinutes) : "",
    products: fromCents(e.productsCents),
    equipment: fromCents(e.equipmentCents),
    rental: fromCents(e.rentalCents),
    subcontract: fromCents(e.subcontractCents),
    other: fromCents(e.otherCents),
    targetMarginPct: String(e.targetMarginPct),
    price: fromCents(e.priceCents),
    weekdays: e.weekdays,
    startTime: e.startTime ?? "",
    startDate: e.startDate ?? "",
    endDate: e.endDate ?? "",
  };
}

function valuesOf(d: Draft) {
  return {
    kind: d.kind,
    people: Math.round(num(d.people)),
    hoursPerPerson: num(d.hoursPerPerson),
    hourlyCostCents: toCents(d.hourlyCost),
    km: num(d.km),
    kmCostCents: toCents(d.kmCost),
    travelMinutes: Math.round(num(d.travelMinutes)),
    productsCents: toCents(d.products),
    equipmentCents: toCents(d.equipment),
    rentalCents: toCents(d.rental),
    subcontractCents: toCents(d.subcontract),
    otherCents: toCents(d.other),
    targetMarginPct: num(d.targetMarginPct),
    priceCents: d.price.trim() ? toCents(d.price) : null,
    weekdays: d.kind === "recurring" ? d.weekdays : [],
    startTime: /^\d{2}:\d{2}$/.test(d.startTime) ? d.startTime : null,
    startDate: d.startDate || null,
    endDate: d.endDate || null,
  };
}

function Money({
  id,
  label,
  value,
  onChange,
  disabled,
  suffix = "€",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  suffix?: string;
}) {
  return (
    <FormField id={id} label={label}>
      <div className="flex items-center gap-1.5">
        <Input
          id={id}
          inputMode="decimal"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
        />
        <span className="text-xs text-muted-foreground">{suffix}</span>
      </div>
    </FormField>
  );
}

/**
 * Chiffrage : saisies par passage, calcul en direct (coût de revient, prix minimum et
 * conseillé, marge), puis validation, devis et contrat sans rien ressaisir.
 */
export function EstimateTab({ estimateId }: { estimateId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const query = useQuery(trpc.estimates.get.queryOptions({ id: estimateId }));
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [rejecting, setRejecting] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (query.data) setDraft(draftOf(query.data));
  }, [query.data]);
  const refresh = () => void queryClient.invalidateQueries();
  const opts = (message: string) => ({
    onSuccess: () => {
      toast.success(message);
      refresh();
    },
    onError: (e: unknown) => toast.error(errorMessage(e)),
  });
  const save = useMutation(
    trpc.estimates.save.mutationOptions({
      onSuccess: (r) => {
        toast.success(
          r.reset ? "Chiffrage enregistré : il repasse en brouillon." : "Chiffrage enregistré.",
        );
        refresh();
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  const submit = useMutation(trpc.estimates.submit.mutationOptions(opts("Envoyé au chef.")));
  const approve = useMutation(
    trpc.estimates.approve.mutationOptions({
      onSuccess: (r) => {
        toast.success(
          r.waitingForBoss
            ? "Validé par le chef ; la marge est sous le minimum : le patron doit aussi valider."
            : "Chiffrage validé.",
        );
        refresh();
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  const reject = useMutation(
    trpc.estimates.reject.mutationOptions({
      onSuccess: () => {
        toast.success("Chiffrage refusé.");
        setRejecting(null);
        refresh();
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  const quote = useMutation(trpc.estimates.createQuote.mutationOptions(opts("Devis créé.")));
  const contract = useMutation(
    trpc.estimates.createContract.mutationOptions(opts("Contrat créé, planning rempli.")),
  );

  if (query.isPending || !draft) return <Skeleton className="h-64" />;
  if (query.error) return <Callout variant="warning">{errorMessage(query.error)}</Callout>;
  const d = query.data;
  const e = d.estimate;
  const locked = ["quoted", "won", "lost"].includes(e.status);
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const values = valuesOf(draft);
  const visits = draft.kind === "recurring" ? visitsPerMonthOf(draft.weekdays) : null;
  const live = computeEstimate({ ...values, visitsPerMonth: visits }, d.minMarginPct);
  const dirty = JSON.stringify(values) !== JSON.stringify(valuesOf(draftOf(d)));

  const row = (label: string, cents: number, strong = false) => (
    <div className={cn("flex justify-between gap-2", strong && "font-medium")}>
      <span className={strong ? undefined : "text-muted-foreground"}>{label}</span>
      <span>{euros(cents)}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="outline">{d.statusLabel}</Badge>
        {e.approvedAt ? (
          <span className="text-muted-foreground">Validé par {d.approvedBy ?? "le chef"}</span>
        ) : null}
        {e.ownerApprovedAt ? (
          <span className="text-muted-foreground">· et par {d.ownerApprovedBy ?? "le patron"}</span>
        ) : null}
        {e.rejectionReason && e.status === "rejected" ? (
          <span className="text-destructive-text">Refusé : {e.rejectionReason}</span>
        ) : null}
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <FormField id="est-kind" label="Type">
          <Select
            value={draft.kind}
            disabled={locked}
            onValueChange={(kind) => set({ kind: kind as Draft["kind"] })}
          >
            <SelectTrigger id="est-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="one_off">Ponctuel</SelectItem>
              <SelectItem value="recurring">Récurrent</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <Money
          id="est-people"
          label="Personnes"
          suffix=""
          value={draft.people}
          disabled={locked}
          onChange={(people) => set({ people })}
        />
        <Money
          id="est-hours"
          label="Heures par personne"
          suffix="h"
          value={draft.hoursPerPerson}
          disabled={locked}
          onChange={(hoursPerPerson) => set({ hoursPerPerson })}
        />
        <Money
          id="est-hourly"
          label="Coût horaire réel (chargé)"
          suffix="€/h"
          value={draft.hourlyCost}
          disabled={locked}
          onChange={(hourlyCost) => set({ hourlyCost })}
        />
        <Money
          id="est-km"
          label="Kilomètres (aller-retour)"
          suffix="km"
          value={draft.km}
          disabled={locked}
          onChange={(km) => set({ km })}
        />
        <Money
          id="est-kmcost"
          label="Coût au km"
          suffix="€/km"
          value={draft.kmCost}
          disabled={locked}
          onChange={(kmCost) => set({ kmCost })}
        />
        <Money
          id="est-travel"
          label="Temps de déplacement"
          suffix="min"
          value={draft.travelMinutes}
          disabled={locked}
          onChange={(travelMinutes) => set({ travelMinutes })}
        />
        <Money
          id="est-products"
          label="Produits"
          value={draft.products}
          disabled={locked}
          onChange={(products) => set({ products })}
        />
        <Money
          id="est-equipment"
          label="Matériel"
          value={draft.equipment}
          disabled={locked}
          onChange={(equipment) => set({ equipment })}
        />
        <Money
          id="est-rental"
          label="Location"
          value={draft.rental}
          disabled={locked}
          onChange={(rental) => set({ rental })}
        />
        <Money
          id="est-sub"
          label="Sous-traitance"
          value={draft.subcontract}
          disabled={locked}
          onChange={(subcontract) => set({ subcontract })}
        />
        <Money
          id="est-other"
          label="Autres coûts"
          value={draft.other}
          disabled={locked}
          onChange={(other) => set({ other })}
        />
        <Money
          id="est-margin"
          label="Marge souhaitée"
          suffix="%"
          value={draft.targetMarginPct}
          disabled={locked}
          onChange={(targetMarginPct) => set({ targetMarginPct })}
        />
        <Money
          id="est-price"
          label="Prix retenu HT (vide = conseillé)"
          value={draft.price}
          disabled={locked}
          onChange={(price) => set({ price })}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {draft.kind === "recurring" ? (
          <div className="space-y-1.5 sm:col-span-3">
            <p className="text-sm font-medium">Jours de passage</p>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((w) => {
                const on = draft.weekdays.includes(w.value);
                return (
                  <Button
                    key={w.value}
                    size="sm"
                    variant={on ? "primary" : "secondary"}
                    disabled={locked}
                    aria-pressed={on}
                    onClick={() =>
                      set({
                        weekdays: on
                          ? draft.weekdays.filter((x) => x !== w.value)
                          : WEEKDAYS.map((x) => x.value).filter(
                              (x) => x === w.value || draft.weekdays.includes(x),
                            ),
                      })
                    }
                  >
                    {w.label}
                  </Button>
                );
              })}
            </div>
          </div>
        ) : null}
        <FormField id="est-start" label={draft.kind === "recurring" ? "Début du contrat" : "Date"}>
          <Input
            id="est-start"
            type="date"
            value={draft.startDate}
            disabled={locked}
            onChange={(ev) => set({ startDate: ev.target.value })}
          />
        </FormField>
        {draft.kind === "recurring" ? (
          <FormField id="est-end" label="Fin (facultatif)">
            <Input
              id="est-end"
              type="date"
              value={draft.endDate}
              disabled={locked}
              onChange={(ev) => set({ endDate: ev.target.value })}
            />
          </FormField>
        ) : null}
        <FormField id="est-time" label="Heure de début">
          <Input
            id="est-time"
            type="time"
            value={draft.startTime}
            disabled={locked}
            onChange={(ev) => set({ startTime: ev.target.value })}
          />
        </FormField>
      </section>

      <section className="grid gap-4 rounded-md border border-border p-4 text-sm sm:grid-cols-2">
        <div className="space-y-1">
          <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Coût de revient par passage
          </p>
          {row("Main-d'œuvre", live.laborCents)}
          {row("Déplacement", live.travelCents)}
          {row("Produits, matériel, location", live.suppliesCents)}
          {row("Sous-traitance", live.subcontractCents)}
          {row("Autres", live.otherCents)}
          {row("Coût total", live.costCents, true)}
        </div>
        <div className="space-y-1">
          <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Prix HT par passage
          </p>
          {row(`Minimum (marge ${d.minMarginPct} %)`, live.minPriceCents)}
          {row(`Conseillé (marge ${values.targetMarginPct} %)`, live.advisedPriceCents)}
          {row("Prix retenu", live.priceCents, true)}
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Marge</span>
            <span className={live.belowMinimum ? "font-medium text-destructive-text" : ""}>
              {euros(live.marginCents)} · {live.marginPct.toLocaleString("fr-FR")} %
            </span>
          </div>
          {live.monthlyPriceCents !== null ? (
            <div className="flex justify-between gap-2 font-medium">
              <span>Forfait mensuel ({visits?.toLocaleString("fr-FR")} passages)</span>
              <span>{euros(live.monthlyPriceCents)}</span>
            </div>
          ) : null}
        </div>
        {live.belowMinimum ? (
          <Callout variant="warning" className="sm:col-span-2">
            Marge sous le minimum de l&apos;entreprise ({d.minMarginPct} %) : le patron devra aussi
            valider.
          </Callout>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center gap-2">
        {!locked ? (
          <Button
            variant={dirty ? "primary" : "secondary"}
            disabled={!dirty || save.isPending}
            onClick={() => save.mutate({ id: estimateId, values })}
          >
            Enregistrer
          </Button>
        ) : null}
        {["draft", "rejected"].includes(e.status) ? (
          <Button
            variant="secondary"
            disabled={dirty || submit.isPending}
            title={dirty ? "Enregistrez d'abord" : undefined}
            onClick={() => submit.mutate({ id: estimateId })}
          >
            Envoyer au chef pour validation
          </Button>
        ) : null}
        {e.status === "submitted" && d.canApprove ? (
          e.approvedById && e.ownerApprovalRequired && !d.isBoss ? (
            <span className="text-sm text-muted-foreground">
              En attente de la validation du patron.
            </span>
          ) : (
            <>
              <Button
                disabled={approve.isPending}
                onClick={() => approve.mutate({ id: estimateId })}
              >
                Valider
              </Button>
              {rejecting === null ? (
                <Button variant="secondary" onClick={() => setRejecting("")}>
                  Refuser
                </Button>
              ) : (
                <span className="flex gap-2">
                  <Input
                    autoFocus
                    className="w-64"
                    aria-label="Motif du refus"
                    placeholder="Motif du refus"
                    value={rejecting}
                    onChange={(ev) => setRejecting(ev.target.value)}
                  />
                  <Button
                    variant="secondary"
                    disabled={!rejecting.trim() || reject.isPending}
                    onClick={() => reject.mutate({ id: estimateId, reason: rejecting })}
                  >
                    Refuser
                  </Button>
                </span>
              )}
            </>
          )
        ) : null}
        {e.status === "approved" ? (
          <Button disabled={quote.isPending} onClick={() => quote.mutate({ id: estimateId })}>
            Créer le devis
          </Button>
        ) : null}
        {e.quoteId ? (
          <Button asChild variant="secondary">
            <Link href={recordPath("quote", e.quoteId)}>Voir le devis</Link>
          </Button>
        ) : null}
        {["approved", "quoted"].includes(e.status) && !e.contractId ? (
          <Button
            variant={e.status === "quoted" ? "primary" : "secondary"}
            disabled={contract.isPending}
            onClick={() => contract.mutate({ id: estimateId })}
          >
            {e.kind === "recurring" ? "Créer le contrat récurrent" : "Créer le contrat ponctuel"}
          </Button>
        ) : null}
        {e.contractId ? (
          <Button asChild variant="secondary">
            <Link href={recordPath("cleaningContract", e.contractId)}>Voir le contrat</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** Contrat ponctuel → récurrent : jours de passage et forfait, planning rempli aussitôt. */
export function ContractRecurrenceTab({ contractId }: { contractId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const record = useQuery(
    trpc.records.get.queryOptions({ entity: "cleaningContract", id: contractId }),
  );
  const [weekdays, setWeekdays] = React.useState<string[]>([]);
  const [monthly, setMonthly] = React.useState("");
  const make = useMutation(
    trpc.estimates.makeRecurring.mutationOptions({
      onSuccess: (r) => {
        toast.success(`Contrat récurrent : ${r.created} passage(s) planifié(s).`);
        void queryClient.invalidateQueries();
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  if (record.isPending) return <Skeleton className="h-24" />;
  if (record.error) return <Callout variant="warning">{errorMessage(record.error)}</Callout>;
  const c = record.data.row as { kind?: unknown };
  if (c.kind !== "one_off")
    return (
      <p className="text-sm text-muted-foreground">
        Contrat récurrent : ses passages sont planifiés d&apos;après les jours de passage. La
        révision annuelle et la reconduction tacite s&apos;appliquent chaque matin.
      </p>
    );
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Contrat ponctuel. Pour en faire un contrat à l&apos;année, choisissez les jours de passage
        et le forfait mensuel : le planning se remplit aussitôt.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {WEEKDAYS.map((w) => {
          const on = weekdays.includes(w.value);
          return (
            <Button
              key={w.value}
              size="sm"
              variant={on ? "primary" : "secondary"}
              aria-pressed={on}
              onClick={() =>
                setWeekdays(
                  on
                    ? weekdays.filter((x) => x !== w.value)
                    : WEEKDAYS.map((x) => x.value).filter(
                        (x) => x === w.value || weekdays.includes(x),
                      ),
                )
              }
            >
              {w.label}
            </Button>
          );
        })}
      </div>
      <div className="flex items-end gap-2">
        <div className="w-48">
          <Money
            id="rec-monthly"
            label="Forfait mensuel HT"
            value={monthly}
            disabled={false}
            onChange={setMonthly}
          />
        </div>
        <Button
          disabled={!weekdays.length || !monthly || make.isPending}
          onClick={() => make.mutate({ contractId, weekdays, monthlyPriceCents: toCents(monthly) })}
        >
          Passer en récurrent
        </Button>
      </div>
    </div>
  );
}
