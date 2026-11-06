import { grantedScope, todayIn } from "@quercy/core";
import { NextResponse } from "next/server";
import readXlsxFile from "read-excel-file/node";

import { AgentMemberError } from "@/server/cleaning/agents";
import { fileRequestContext } from "@/server/files/access";
import { type SheetData, analyzeV12 } from "@/server/imports/v12-analyze";
import { importV12 } from "@/server/imports/v12-import";

export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Import du fichier Excel V12 : `?mode=preview` analyse et montre ce qui sera créé ;
 * `?mode=import` l'enregistre. Le fichier n'est jamais conservé (données réelles des clients).
 */
export async function POST(request: Request) {
  const ctx = await fileRequestContext();
  if (!ctx)
    return NextResponse.json({ error: "Session expirée : reconnectez-vous." }, { status: 401 });
  const { organization, role, billing } = ctx.workspace;
  if (!organization.modules.includes("cleaning"))
    return NextResponse.json({ error: "Le module Nettoyage n'est pas activé." }, { status: 403 });
  const scope = grantedScope(role.permissions, "cleaning", "create");
  if (!scope || scope === "own")
    return NextResponse.json(
      { error: "Seul un responsable peut importer le fichier de pilotage." },
      { status: 403 },
    );
  const mode = new URL(request.url).searchParams.get("mode") === "import" ? "import" : "preview";
  if (mode === "import" && billing.readOnly)
    return NextResponse.json({ error: "L'espace est en lecture seule." }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !/\.xlsx$/i.test(file.name))
    return NextResponse.json({ error: "Choisissez le fichier Excel (.xlsx)." }, { status: 400 });
  if (file.size > MAX_BYTES)
    return NextResponse.json(
      { error: "Fichier trop volumineux (10 Mo maximum)." },
      { status: 400 },
    );

  let sheets: SheetData[];
  try {
    sheets = (await readXlsxFile(Buffer.from(await file.arrayBuffer()))) as unknown as SheetData[];
  } catch {
    return NextResponse.json({ error: "Fichier Excel illisible." }, { status: 400 });
  }
  const analysis = analyzeV12(sheets, todayIn("Europe/Paris"));
  if (mode === "preview") return NextResponse.json({ analysis });
  if (analysis.sites.length === 0)
    return NextResponse.json(
      { error: analysis.warnings[0] ?? "Aucun site à importer." },
      { status: 400 },
    );
  try {
    const summary = await importV12(ctx, analysis);
    return NextResponse.json({ summary, warnings: analysis.warnings });
  } catch (error) {
    if (error instanceof AgentMemberError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
