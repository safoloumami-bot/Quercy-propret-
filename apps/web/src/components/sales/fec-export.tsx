"use client";

import { Button } from "@quercy/ui/components/button";
import { Callout } from "@quercy/ui/components/callout";
import { Input } from "@quercy/ui/components/input";
import { DownloadIcon, InfoIcon } from "lucide-react";
import * as React from "react";

/** Choix de l'exercice et téléchargement du FEC. */
export function FecExport() {
  const [year, setYear] = React.useState(() => new Date().getFullYear());
  return (
    <div className="space-y-4">
      <Callout variant="info" icon={<InfoIcon />}>
        Le FEC reprend les factures et avoirs émis (journal des ventes), les factures fournisseurs
        (journal des achats) et les encaissements (journal de banque), avec les comptes 411, 706,
        445710, 401, 606, 445660 et 512. Votre expert-comptable l&apos;importe tel quel dans son
        logiciel.
      </Callout>
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1.5 text-sm font-medium">
          Exercice (année civile)
          <Input
            type="number"
            min={2000}
            max={2100}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-32"
          />
        </label>
        <Button asChild>
          <a href={`/api/ventes/fec?year=${year}`} download>
            <DownloadIcon />
            Télécharger le FEC {year}
          </a>
        </Button>
      </div>
    </div>
  );
}
