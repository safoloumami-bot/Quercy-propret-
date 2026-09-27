"use client";

import type { FieldDef } from "@quercy/core";
import { Checkbox } from "@quercy/ui/components/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@quercy/ui/components/command";
import { Input } from "@quercy/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@quercy/ui/components/select";
import { Textarea } from "@quercy/ui/components/textarea";
import { cn } from "@quercy/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { CheckIcon } from "lucide-react";
import * as React from "react";

import { useTRPC } from "@/lib/trpc";

const NONE = "__none__";

/** Valeur brute → texte éditable. */
export function toEditable(field: FieldDef, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (field.type === "date" || field.type === "datetime") return String(value).slice(0, 10);
  return String(value);
}

/** Liste des membres de l'espace (responsables). */
export function useUserOptions(enabled = true) {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.records.options.queryOptions({ kind: "user" }),
    enabled,
    staleTime: 60_000,
  });
}

function RelationPicker({
  value,
  label,
  onCommit,
  autoFocus,
}: {
  value: string | null;
  label?: string;
  onCommit: (value: string | null) => void;
  autoFocus?: boolean;
}) {
  const trpc = useTRPC();
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 200);
    return () => clearTimeout(t);
  }, [search]);
  const options = useQuery(
    trpc.records.options.queryOptions({ kind: "company", search: debounced || undefined }),
  );
  return (
    <Command shouldFilter={false} className="rounded-md border border-border">
      <CommandInput
        value={search}
        onValueChange={setSearch}
        placeholder={label ?? "Rechercher une entreprise…"}
        autoFocus={autoFocus}
      />
      <CommandList className="max-h-56">
        <CommandEmpty>{options.isPending ? "Recherche…" : "Aucune entreprise."}</CommandEmpty>
        <CommandGroup>
          {value ? (
            <CommandItem value="__clear__" onSelect={() => onCommit(null)}>
              Retirer l&apos;entreprise
            </CommandItem>
          ) : null}
          {(options.data ?? []).map((o) => (
            <CommandItem key={o.value} value={o.value} onSelect={() => onCommit(o.value)}>
              <span className="flex-1 truncate">{o.label}</span>
              {o.hint ? <span className="text-xs text-muted-foreground">{o.hint}</span> : null}
              {o.value === value ? <CheckIcon className="!text-foreground" /> : null}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

/**
 * Éditeur d'une valeur selon son type. `onCommit` reçoit la valeur saisie (le serveur valide) ;
 * Entrée valide, Échap annule.
 */
export function FieldEditor({
  field,
  value,
  onCommit,
  onCancel,
  autoFocus = true,
  className,
  id,
}: {
  field: FieldDef;
  value: unknown;
  onCommit: (value: unknown) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  className?: string;
  id?: string;
}) {
  const [draft, setDraft] = React.useState(toEditable(field, value));
  const users = useUserOptions(field.type === "user");
  const commitText = () => {
    if (draft !== toEditable(field, value))
      onCommit(field.type === "tags" || field.type === "multiselect" ? draft : draft);
    else onCancel?.();
  };
  const keys = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onCancel?.();
    } else if (e.key === "Enter" && field.type !== "longtext") {
      e.preventDefault();
      e.stopPropagation();
      commitText();
    }
  };

  switch (field.type) {
    case "boolean":
      return (
        <Checkbox
          id={id}
          checked={Boolean(value)}
          onCheckedChange={(v) => onCommit(v === true)}
          autoFocus={autoFocus}
          aria-label={field.label}
        />
      );
    case "select":
      return (
        <Select
          value={(value as string | null) ?? NONE}
          onValueChange={(v) => onCommit(v === NONE ? "" : v)}
          defaultOpen={autoFocus && Boolean(onCancel)}
          onOpenChange={(open) => (!open && onCancel ? onCancel() : null)}
        >
          <SelectTrigger id={id} className={cn("h-7", className)} aria-label={field.label}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            {(field.options ?? []).map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "user":
      return (
        <Select
          value={(value as string | null) ?? NONE}
          onValueChange={(v) => onCommit(v === NONE ? "" : v)}
          defaultOpen={autoFocus && Boolean(onCancel)}
          onOpenChange={(open) => (!open && onCancel ? onCancel() : null)}
        >
          <SelectTrigger id={id} className={cn("h-7", className)} aria-label={field.label}>
            <SelectValue placeholder={users.isPending ? "Chargement…" : "—"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Personne</SelectItem>
            {(users.data ?? []).map((u) => (
              <SelectItem key={u.value} value={u.value}>
                {u.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "relation":
      return (
        <RelationPicker
          value={(value as string | null) ?? null}
          onCommit={onCommit}
          autoFocus={autoFocus}
        />
      );
    case "longtext":
      return (
        <Textarea
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitText}
          onKeyDown={keys}
          autoFocus={autoFocus}
          className={className}
        />
      );
    default:
      return (
        <Input
          id={id}
          type={
            field.type === "date" || field.type === "datetime"
              ? "date"
              : field.type === "email"
                ? "email"
                : "text"
          }
          inputMode={["number", "currency", "percent"].includes(field.type) ? "decimal" : undefined}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitText}
          onKeyDown={keys}
          autoFocus={autoFocus}
          placeholder={field.type === "tags" ? "étiquette1, étiquette2" : undefined}
          aria-label={field.label}
          className={cn("h-7", className)}
        />
      );
  }
}
