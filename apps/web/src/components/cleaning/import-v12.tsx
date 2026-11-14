"use client";

import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import { Callout } from "@quercy/ui/components/callout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@quercy/ui/components/card";
import { AlertTriangleIcon, FileSpreadsheetIcon, UploadIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import type { V12Analysis } from "@/server/imports/v12-analyze";
import type { V12ImportSummary } from "@/server/imports/v12-import";

async function send(file: File, mode: "preview" | "import") {
  const body = new FormData();
  body.set("file", file);
  const res = await fetch(`/api/nettoyage/import-v12?mode=${mode}`, { method: "POST", body });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    analysis?: V12Analysis;
    summary?: V12ImportSummary;
    warnings?: string[];
  };
  if (!res.ok) throw new Error(data.error ?? "Import impossible.");
  return data;
}

const frDate = (d: string | null) =>
  d ? new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-FR") : "—";

/**
 * Import du fichier Excel de pilotage (V12) : analyse, aperçu de tout ce qui sera créé, puis
 * import. Le fichier n'est jamais conservé ; les règles de récurrence restent à valider.
 */
export function ImportV12() {
  const [file, setFile] = React.useState<File | null>(null);
  const [analysis, setAnalysis] = React.useState<V12Analysis | null>(null);
  const [summary, setSummary] = React.useState<V12ImportSummary | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function run(mode: "preview" | "import") {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const data = await send(file, mode);
      if (mode === "preview") setAnalysis(data.analysis ?? null);
      else setSummary(data.summary ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (summary)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import terminé</CardTitle>
          <CardDescription>
            Rien n&apos;est encore planifié : validez les règles de récurrence proposées.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            <li>
              Sites : <strong>{summary.sites.created}</strong> créés, {summary.sites.existing} déjà
              présents
            </li>
            <li>
              Clients : <strong>{summary.clients.created}</strong> créés, {summary.clients.existing}{" "}
              déjà présents
            </li>
            <li>
              Intervenants : <strong>{summary.agents.created}</strong> créés,{" "}
              {summary.agents.matched} retrouvés
            </li>
            <li>
              Récurrences proposées : <strong>{summary.series.proposed}</strong>
              {summary.series.existing ? ` (${summary.series.existing} déjà importées)` : ""}
            </li>
            <li>
              Passages réalisés repris : <strong>{summary.history.created}</strong>
              {summary.history.existing ? ` (${summary.history.existing} déjà présents)` : ""}
            </li>
          </ul>
          <Button asChild>
            <Link href="/nettoyage/recurrences">Valider les récurrences</Link>
          </Button>
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Fichier Excel de pilotage (V12)</CardTitle>
          <CardDescription>
            Le fichier est lu puis oublié : il n&apos;est jamais conservé. Vous verrez tout ce qui
            sera créé avant de confirmer. Un second import ne crée aucun doublon.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent">
            <FileSpreadsheetIcon className="size-4" aria-hidden />
            {file ? file.name : "Choisir le fichier .xlsx"}
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setAnalysis(null);
              }}
            />
          </label>
          <Button disabled={!file || busy} onClick={() => run("preview")}>
            {busy && !analysis ? "Analyse…" : "Analyser"}
          </Button>
        </CardContent>
      </Card>

      {error ? <Callout variant="danger">{error}</Callout> : null}

      {analysis ? (
        <>
          {analysis.warnings.map((w) => (
            <Callout key={w} variant="warning" icon={<AlertTriangleIcon />}>
              {w}
            </Callout>
          ))}
          <Card>
            <CardHeader>
              <CardTitle>
                {analysis.sites.length} sites · {analysis.agents.length} intervenants ·{" "}
                {analysis.tours.length} tournées · {analysis.history.length} passages réalisés
              </CardTitle>
              <CardDescription>
                Les noms viennent de la colonne « Nom du site ». Les règles sont des propositions à
                valider ensuite ; les points signalés sont à vérifier.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Code</th>
                    <th className="py-2 pr-3 font-medium">Site</th>
                    <th className="py-2 pr-3 font-medium">Client</th>
                    <th className="py-2 pr-3 font-medium">Ville</th>
                    <th className="py-2 pr-3 font-medium">Intervenant</th>
                    <th className="py-2 pr-3 font-medium">Règle proposée</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {analysis.sites.map((s) => (
                    <tr key={s.code} className="align-top">
                      <td className="py-2 pr-3">
                        <Badge variant="outline">{s.code}</Badge>
                      </td>
                      <td className="py-2 pr-3 font-medium">
                        {s.name}
                        <div className="text-xs font-normal text-muted-foreground">
                          {s.activityLabel}
                          {s.address ? ` · ${s.address}` : ""}
                        </div>
                      </td>
                      <td className="py-2 pr-3">{s.client ?? "—"}</td>
                      <td className="py-2 pr-3">{s.city ?? "—"}</td>
                      <td className="py-2 pr-3">
                        {s.agent ?? "—"}
                        {s.startTime ? (
                          <div className="text-xs text-muted-foreground">
                            {s.startTime}
                            {s.durationMinutes ? ` · ${s.durationMinutes} min` : ""}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3">
                        {s.proposal ? (
                          <>
                            {s.proposal.description}
                            <div className="text-xs text-muted-foreground">
                              à partir du {frDate(s.proposal.effectiveFrom)}
                            </div>
                          </>
                        ) : (
                          <span className="text-warning-text">À définir</span>
                        )}
                        {s.warnings.length || s.toComplete.length ? (
                          <ul className="mt-1 space-y-0.5 text-xs text-warning-text">
                            {s.warnings.map((w) => (
                              <li key={w}>{w}</li>
                            ))}
                            {s.toComplete.length ? (
                              <li>À compléter : {s.toComplete.join(", ")}</li>
                            ) : null}
                          </ul>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          {analysis.history.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Passages déjà réalisés</CardTitle>
                <CardDescription>
                  Repris comme interventions terminées, sans heure de début ni de fin inventée.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {analysis.history.map((h) => (
                    <li key={`${h.siteCode}-${h.date}`}>
                      <Badge variant="outline">{h.siteCode}</Badge> {frDate(h.date)} —{" "}
                      {h.actualAgent ?? h.plannedAgent ?? "intervenant non renseigné"}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
          <div className="flex justify-end">
            <Button disabled={busy || analysis.sites.length === 0} onClick={() => run("import")}>
              <UploadIcon aria-hidden />{" "}
              {busy ? "Import…" : `Importer ${analysis.sites.length} sites`}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
