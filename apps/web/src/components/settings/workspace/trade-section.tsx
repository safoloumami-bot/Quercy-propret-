"use client";

import { MODULES, TRADES, type TradeKey } from "@quercy/core";
import { Button } from "@quercy/ui/components/button";
import { Callout } from "@quercy/ui/components/callout";
import { toast } from "@quercy/ui/components/toaster";
import { useMutation } from "@tanstack/react-query";
import { InfoIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { toastError } from "@/components/toast-error";
import { TradePicker } from "@/components/trades/trade-picker";
import { useTRPC } from "@/lib/trpc";

import { SettingsSection } from "../section";

/** Corps de métier de l'espace : catalogue type, mentions des devis et assistant adaptés. */
export function TradeSection({ current, canEdit }: { current: TradeKey | null; canEdit: boolean }) {
  const trpc = useTRPC();
  const router = useRouter();
  const [selected, setSelected] = React.useState<TradeKey | null>(current);
  const [missing, setMissing] = React.useState<string[]>([]);
  const apply = useMutation(trpc.workspace.applyTrade.mutationOptions());

  function save() {
    if (!selected) return;
    apply.mutate(
      { trade: selected },
      {
        onSuccess: (result) => {
          router.refresh();
          setMissing(result.missingModules.map((m) => MODULES[m].name));
          toast.success(
            result.productsAdded > 0
              ? `Métier enregistré : ${result.productsAdded} prestations types ajoutées au catalogue.`
              : "Métier enregistré. Le catalogue contenait déjà les prestations types.",
          );
        },
        onError: toastError,
      },
    );
  }

  return (
    <SettingsSection
      id="metier"
      title="Métier"
      description="Le logiciel s'adapte à votre métier : prestations types dans le catalogue (prix et TVA à ajuster), mentions des devis et factures (assurance décennale, TVA réduite des travaux) et un assistant IA qui connaît les règles de votre activité. Rien de ce que vous avez déjà saisi n'est modifié."
      footer={
        canEdit ? (
          <Button onClick={save} disabled={!selected || selected === current || apply.isPending}>
            {apply.isPending
              ? "Application…"
              : current && selected && selected !== current
                ? "Changer de métier"
                : "Appliquer ce métier"}
          </Button>
        ) : null
      }
    >
      <div className="space-y-4">
        <TradePicker value={selected} onChange={setSelected} disabled={!canEdit} />
        {selected ? (
          <p className="text-sm text-muted-foreground">
            {TRADES[selected].catalog.length} prestations types
            {TRADES[selected].decennial ? ", mention de l'assurance décennale" : ""}
            {TRADES[selected].renovationVat ? ", mention de TVA réduite des travaux" : ""}.
          </p>
        ) : null}
        {missing.length > 0 ? (
          <Callout icon={<InfoIcon />}>
            Modules conseillés pour ce métier, pas encore activés : {missing.join(", ")}. Vous
            pouvez les activer ci-dessous.
          </Callout>
        ) : null}
      </div>
    </SettingsSection>
  );
}
