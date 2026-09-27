"use client";

import { type FieldDef, formatCents } from "@quercy/core";
import { Avatar, AvatarFallback, initials } from "@quercy/ui/components/avatar";
import { Badge } from "@quercy/ui/components/badge";
import { cn } from "@quercy/ui/lib/utils";
import { CheckIcon } from "lucide-react";
import Link from "next/link";

import type { Row } from "./types";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });
const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });
const numberFmt = new Intl.NumberFormat("fr-FR");

/** Montant en euros (les montants CRM sont saisis en euros, pas en centimes). */
export function formatEuros(value: number): string {
  return formatCents(Math.round(value * 100));
}

export function isEmptyValue(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

/** Affichage d'une valeur selon le type du champ (cellule de tableau ou fiche). */
export function FieldDisplay({
  field,
  row,
  className,
}: {
  field: FieldDef;
  row: Row;
  className?: string;
}) {
  const value = row[field.key];
  if (isEmptyValue(value)) return <span className="text-muted-foreground/60">—</span>;

  switch (field.type) {
    case "select": {
      const option = field.options?.find((o) => o.value === value);
      return <Badge variant={option?.tone ?? "neutral"}>{option?.label ?? String(value)}</Badge>;
    }
    case "multiselect":
    case "tags":
      return (
        <span className={cn("flex flex-wrap gap-1", className)}>
          {(value as string[]).map((t) => (
            <Badge key={t} variant="outline">
              {t}
            </Badge>
          ))}
        </span>
      );
    case "user": {
      const name = row.labels[field.key];
      if (!name) return <span className="text-muted-foreground/60">—</span>;
      return (
        <span className="flex min-w-0 items-center gap-2">
          <Avatar className="size-5">
            <AvatarFallback className="text-[9px]">{initials(name)}</AvatarFallback>
          </Avatar>
          <span className="truncate">{name}</span>
        </span>
      );
    }
    case "relation": {
      const label = row.labels[field.key];
      if (!label || field.relation !== "company")
        return <span className="truncate">{label ?? String(value)}</span>;
      return (
        <Link
          href={`/crm/entreprises/${String(value)}`}
          className="truncate text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          {label}
        </Link>
      );
    }
    case "email":
      return (
        <a
          href={`mailto:${String(value)}`}
          className="truncate hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {String(value)}
        </a>
      );
    case "phone":
      return (
        <a
          href={`tel:${String(value).replace(/\s/g, "")}`}
          className="truncate tabular-nums hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {String(value)}
        </a>
      );
    case "url":
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noreferrer"
          className="truncate hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {String(value).replace(/^https?:\/\/(www\.)?/, "")}
        </a>
      );
    case "currency":
      return <span className="tabular-nums">{formatEuros(Number(value))}</span>;
    case "percent":
      return <span className="tabular-nums">{numberFmt.format(Number(value))} %</span>;
    case "number":
      return <span className="tabular-nums">{numberFmt.format(Number(value))}</span>;
    case "date":
      return <span className="tabular-nums">{dateFmt.format(new Date(value as string))}</span>;
    case "datetime":
      return <span className="tabular-nums">{dateTimeFmt.format(new Date(value as string))}</span>;
    case "boolean":
      return value ? (
        <CheckIcon className="size-4 text-success" aria-label="Oui" />
      ) : (
        <span className="text-muted-foreground">Non</span>
      );
    default:
      return <span className={cn("truncate", className)}>{String(value)}</span>;
  }
}
