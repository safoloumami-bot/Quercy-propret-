import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { ReportList } from "@/components/reports/report-list";

export const metadata: Metadata = { title: "Rapports" };

export default function ReportsPage() {
  return (
    <div className="mx-auto w-full max-w-[2000px] space-y-8 px-8 py-8">
      <PageHeader
        title="Rapports"
        description="Analysez vos données : modèles prêts à l'emploi ou constructeur (données, mesure, regroupement, graphique), exports PDF, Excel et CSV, envois programmés."
      />
      <ReportList />
    </div>
  );
}
