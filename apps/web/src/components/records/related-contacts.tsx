"use client";

import { ENTITIES } from "@quercy/core";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { useTRPC } from "@/lib/trpc";

import { FieldDisplay } from "./field-display";
import type { Row } from "./types";

const STATUS = ENTITIES.contact.fields.find((f) => f.key === "status")!;

/** Contacts rattachés à une entreprise (vue 360°). */
export function RelatedContacts({ companyId }: { companyId: string }) {
  const trpc = useTRPC();
  const contacts = useQuery(
    trpc.records.list.queryOptions({
      entity: "contact",
      filter: { combinator: "and", rules: [] },
      and: { field: "companyId", operator: "in", value: [companyId] },
      sort: [{ field: "lastName", direction: "asc" }],
      limit: 100,
    }),
  );
  if (contacts.isPending) return <Skeleton className="h-16" />;
  const rows = contacts.data?.rows ?? [];
  if (rows.length === 0)
    return (
      <p className="text-sm text-muted-foreground">Aucun contact rattaché à cette entreprise.</p>
    );
  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {rows.map((c) => (
        <li key={c.id}>
          <Link
            href={`/crm/contacts/${c.id}`}
            className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent"
          >
            <span className="flex-1 truncate font-medium">{c.title}</span>
            <span className="truncate text-muted-foreground">
              {(c.jobTitle as string | null) ?? ""}
            </span>
            {c.status ? <FieldDisplay field={STATUS} row={c as Row} /> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
