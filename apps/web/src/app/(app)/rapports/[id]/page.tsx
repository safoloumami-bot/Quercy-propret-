import type { Metadata } from "next";

import { ReportPage } from "@/components/reports/report-page";

export const metadata: Metadata = { title: "Rapport" };

export default async function SavedReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReportPage id={id} />;
}
