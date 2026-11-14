"use client";

import {
  type FieldDef,
  type FilterGroup,
  type FilterRule,
  OPERATORS_BY_TYPE,
  OPERATOR_LABELS,
  type Operator,
  VALUELESS,
  countRules,
  isGroup,
} from "@quercy/core";
import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import { Input } from "@quercy/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@quercy/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@quercy/ui/components/select";
import { FilterIcon, ListPlusIcon, PlusIcon, XIcon } from "lucide-react";

import { useUserOptions } from "./field-editor";

function defaultRule(field: FieldDef): FilterRule {
  return { field: field.key, operator: OPERATORS_BY_TYPE[field.type][0]! };
}

function ValueInput({
  field,
  rule,
  onChange,
}: {
  field: FieldDef;
  rule: FilterRule;
  onChange: (value: unknown) => void;
}) {
  const users = useUserOptions(field.type === "user");
  if (VALUELESS.has(rule.operator)) return null;
  const choices =
    field.type === "user"
      ? (users.data ?? []).map((u) => ({ value: u.value, label: u.label }))
      : field.type === "select"
        ? (field.options ?? [])
        : null;
  if (choices && (rule.operator === "in" || rule.operator === "not_in")) {
    const selected = Array.isArray(rule.value) ? (rule.value as string[]) : [];
    return (
      <Select
        value=""
        onValueChange={(v) =>
          onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v])
        }
      >
        <SelectTrigger className="h-7 min-w-40 flex-1" aria-label="Valeurs">
          <span className="truncate">
            {selected.length === 0
              ? "Choisir…"
              : selected.map((s) => choices.find((c) => c.value === s)?.label ?? s).join(", ")}
          </span>
        </SelectTrigger>
        <SelectContent>
          {choices.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {selected.includes(c.value) ? "✓ " : ""}
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (rule.operator === "between") {
    const [a, b] = Array.isArray(rule.value) ? (rule.value as string[]) : ["", ""];
    const type = field.type === "date" || field.type === "datetime" ? "date" : "text";
    return (
      <span className="flex flex-1 items-center gap-1">
        <Input
          type={type}
          value={a ?? ""}
          onChange={(e) => onChange([e.target.value, b])}
          className="h-7"
          aria-label="De"
        />
        <span className="text-xs text-muted-foreground">et</span>
        <Input
          type={type}
          value={b ?? ""}
          onChange={(e) => onChange([a, e.target.value])}
          className="h-7"
          aria-label="À"
        />
      </span>
    );
  }
  const isDate =
    (field.type === "date" || field.type === "datetime") &&
    (rule.operator === "before" || rule.operator === "after");
  const listText = Array.isArray(rule.value)
    ? (rule.value as string[]).join(", ")
    : String(rule.value ?? "");
  return (
    <Input
      type={isDate ? "date" : "text"}
      value={listText}
      onChange={(e) =>
        onChange(
          ["has_any", "has_all", "has_none", "in", "not_in"].includes(rule.operator)
            ? e.target.value
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean)
            : e.target.value,
        )
      }
      placeholder={rule.operator.startsWith("in_") ? "Nombre de jours" : "Valeur"}
      className="h-7 flex-1"
      aria-label="Valeur"
    />
  );
}

function RuleRow({
  fields,
  rule,
  onChange,
  onRemove,
}: {
  fields: FieldDef[];
  rule: FilterRule;
  onChange: (rule: FilterRule) => void;
  onRemove: () => void;
}) {
  const field = fields.find((f) => f.key === rule.field) ?? fields[0]!;
  return (
    <div className="flex items-center gap-1.5">
      <Select
        value={field.key}
        onValueChange={(key) => onChange(defaultRule(fields.find((f) => f.key === key)!))}
      >
        <SelectTrigger className="h-7 w-40" aria-label="Champ">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {fields.map((f) => (
            <SelectItem key={f.key} value={f.key}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={rule.operator}
        onValueChange={(op) => onChange({ ...rule, operator: op as Operator, value: undefined })}
      >
        <SelectTrigger className="h-7 w-44" aria-label="Condition">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPERATORS_BY_TYPE[field.type].map((op) => (
            <SelectItem key={op} value={op}>
              {OPERATOR_LABELS[op]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ValueInput field={field} rule={rule} onChange={(value) => onChange({ ...rule, value })} />
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onRemove}
        aria-label="Retirer cette condition"
      >
        <XIcon />
      </Button>
    </div>
  );
}

function Combinator({
  value,
  onChange,
}: {
  value: "and" | "or";
  onChange: (v: "and" | "or") => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as "and" | "or")}>
      <SelectTrigger className="h-7 w-auto gap-1 border-dashed text-xs" aria-label="Combinaison">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="and">Toutes les conditions (ET)</SelectItem>
        <SelectItem value="or">Au moins une condition (OU)</SelectItem>
      </SelectContent>
    </Select>
  );
}

/** Constructeur de filtres : conditions et groupes, combinés en ET ou en OU. */
export function FilterBuilder({
  fields,
  value,
  onChange,
}: {
  fields: FieldDef[];
  value: FilterGroup;
  onChange: (next: FilterGroup) => void;
}) {
  const filterable = fields.filter((f) => f.filterable !== false);
  const count = countRules(value);
  const setRule = (index: number, rule: FilterRule | FilterGroup) =>
    onChange({ ...value, rules: value.rules.map((r, i) => (i === index ? rule : r)) });
  const removeRule = (index: number) =>
    onChange({ ...value, rules: value.rules.filter((_, i) => i !== index) });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant={count > 0 ? "subtle" : "ghost"} size="sm">
          <FilterIcon />
          Filtrer
          {count > 0 ? <Badge variant="primary">{count}</Badge> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[640px] space-y-3" align="start">
        {value.rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun filtre : toutes les fiches sont affichées.
          </p>
        ) : (
          <>
            <Combinator
              value={value.combinator}
              onChange={(combinator) => onChange({ ...value, combinator })}
            />
            <div className="space-y-2">
              {value.rules.map((rule, index) =>
                isGroup(rule) ? (
                  <div
                    key={index}
                    className="space-y-2 rounded-md border border-dashed border-border p-2"
                  >
                    <div className="flex items-center justify-between">
                      <Combinator
                        value={rule.combinator}
                        onChange={(combinator) => setRule(index, { ...rule, combinator })}
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeRule(index)}
                        aria-label="Retirer le groupe"
                      >
                        <XIcon />
                      </Button>
                    </div>
                    {rule.rules.map((inner, j) =>
                      isGroup(inner) ? null : (
                        <RuleRow
                          key={j}
                          fields={filterable}
                          rule={inner}
                          onChange={(r) =>
                            setRule(index, {
                              ...rule,
                              rules: rule.rules.map((x, k) => (k === j ? r : x)),
                            })
                          }
                          onRemove={() => {
                            const rest = rule.rules.filter((_, k) => k !== j);
                            if (rest.length === 0) removeRule(index);
                            else setRule(index, { ...rule, rules: rest });
                          }}
                        />
                      ),
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setRule(index, {
                          ...rule,
                          rules: [...rule.rules, defaultRule(filterable[0]!)],
                        })
                      }
                    >
                      <PlusIcon />
                      Condition dans le groupe
                    </Button>
                  </div>
                ) : (
                  <RuleRow
                    key={index}
                    fields={filterable}
                    rule={rule}
                    onChange={(r) => setRule(index, r)}
                    onRemove={() => removeRule(index)}
                  />
                ),
              )}
            </div>
          </>
        )}
        <div className="flex items-center gap-2 border-t border-border pt-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              onChange({ ...value, rules: [...value.rules, defaultRule(filterable[0]!)] })
            }
          >
            <PlusIcon />
            Ajouter une condition
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({
                ...value,
                rules: [
                  ...value.rules,
                  {
                    combinator: value.combinator === "and" ? "or" : "and",
                    rules: [defaultRule(filterable[0]!)],
                  },
                ],
              })
            }
          >
            <ListPlusIcon />
            Ajouter un groupe
          </Button>
          {value.rules.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => onChange({ combinator: "and", rules: [] })}
            >
              Tout effacer
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
