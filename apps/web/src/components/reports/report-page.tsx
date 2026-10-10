"use client";

import { Callout } from "@quercy/ui/components/callout";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { errorMessage, useTRPC } from "@/lib/trpc";

import { ReportWorkspace } from "./report-workspace";

export function ReportPage({ id }: { id: string }) {
  const trpc = useTRPC();
  const report = useQuery(trpc.reports.get.queryOptions({ id }));
  return (
    <div className="mx-auto w-full max-w-[2000px] space-y-6 px-8 py-8">
      {report.isPending ? (
        <Skeleton className="h-96" />
      ) : report.isError ? (
        <Callout variant="danger" icon={<CircleAlertIcon />}>
          {errorMessage(report.error)}
        </Callout>
      ) : (
        <>
          <PageHeader title={report.data.name} description={report.data.description ?? undefined} />
          <ReportWorkspace
            key={report.data.id}
            initialDefinition={report.data.definition}
            saved={report.data}
          />
        </>
      )}
    </div>
  );
}
