"use client";

import {
  AUTOMATION_ACTION_LABELS,
  AUTOMATION_TRIGGERS,
  type AutomationAction,
  type AutomationInput,
  ENTITIES,
  ENTITY_KEYS,
  type EntityKey,
  type FilterGroup,
  TRIGGER_LABELS,
  countRules,
  entityFields,
} from "@quercy/core";
import { Button } from "@quercy/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@quercy/ui/components/dialog";
import { Input } from "@quercy/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@quercy/ui/components/select";
import { Textarea } from "@quercy/ui/components/textarea";
import { PlusIcon, Trash2Icon } from "lucide-react";
import * as React from "react";

import { FormField } from "@/components/form-field";
import { FilterBuilder } from "@/components/records/filter-builder";
import { useAccess } from "@/components/shell/access-context";

export type EditableAutomation = AutomationInput & { id?: string };

const DEFAULT_ACTIONS: Record<AutomationAction["type"], AutomationAction> = {
  notify: { type: "notify", to: "owner", message: "« {{titre}} » demande votre attention." },
  set_field: { type: "set_field", field: "", value: "" },
  send_email: {
    type: "send_email",
    to: "",
    subject: "{{titre}}",
    body: "Bonjour,\n\n« {{titre}} » vient d'être mis à jour : {{lien}}",
  },
  create_task: { type: "create_task", title: "Suivre « {{titre}} »", dueInDays: 3 },
};

/** Éditeur « Quand… Si… Alors… » d'une automatisation. */
export function AutomationEditor({
  value,
  open,
  onOpenChange,
  onSave,
  pending,
}: {
  value: EditableAutomation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (value: EditableAutomation) => void;
  pending: boolean;
}) {
  const { allows } = useAccess();
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]);
  const entities = ENTITY_KEYS.filter((k) => allows(ENTITIES[k].module, "view"));
  const fields = entityFields(ENTITIES[draft.entity]);
  const settable = fields.filter(
    (f) => f.editable && ["select", "boolean", "user", "text", "date", "number"].includes(f.type),
  );
  const setAction = (index: number, action: AutomationAction) =>
    setDraft((d) => ({ ...d, actions: d.actions.map((a, i) => (i === index ? action : a)) }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {value.id ? "Modifier l'automatisation" : "Nouvelle automatisation"}
          </DialogTitle>
          <DialogDescription>
            Variables dans les textes : {"{{titre}}"}, {"{{lien}}"} et toute clé de champ (ex.{" "}
            {"{{status}}"}).
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(draft);
          }}
        >
          <FormField id="automation-name" label="Nom">
            <Input
              id="automation-name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              required
              maxLength={120}
            />
          </FormField>
          <fieldset className="grid grid-cols-2 gap-3">
            <legend className="mb-1.5 text-sm font-semibold">Quand</legend>
            <FormField id="automation-entity" label="Fiches">
              <Select
                value={draft.entity}
                onValueChange={(v) =>
                  setDraft({
                    ...draft,
                    entity: v as EntityKey,
                    conditions: { combinator: "and", rules: [] },
                    actions: draft.actions.filter((a) => a.type !== "set_field"),
                  })
                }
              >
                <SelectTrigger id="automation-entity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((k) => (
                    <SelectItem key={k} value={k}>
                      {ENTITIES[k].labelPlural}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField id="automation-trigger" label="Évènement">
              <Select
                value={draft.trigger}
                onValueChange={(v) =>
                  setDraft({ ...draft, trigger: v as EditableAutomation["trigger"] })
                }
              >
                <SelectTrigger id="automation-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUTOMATION_TRIGGERS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TRIGGER_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </fieldset>
          <fieldset className="space-y-1.5">
            <legend className="mb-1.5 text-sm font-semibold">Si</legend>
            <div className="flex items-center gap-3">
              <FilterBuilder
                fields={fields}
                value={draft.conditions as FilterGroup}
                onChange={(conditions) => setDraft({ ...draft, conditions })}
              />
              <p className="text-xs text-muted-foreground">
                {countRules(draft.conditions as FilterGroup) === 0
                  ? "Toutes les fiches (aucune condition)."
                  : "Seules les fiches qui correspondent au filtre."}
              </p>
            </div>
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="mb-1.5 text-sm font-semibold">Alors</legend>
            {draft.actions.map((action, index) => (
              <div key={index} className="space-y-3 rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <Select
                    value={action.type}
                    onValueChange={(t) =>
                      setAction(index, DEFAULT_ACTIONS[t as AutomationAction["type"]])
                    }
                  >
                    <SelectTrigger aria-label={`Action ${index + 1}`} className="w-56">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(AUTOMATION_ACTION_LABELS) as AutomationAction["type"][]).map(
                        (t) => (
                          <SelectItem key={t} value={t}>
                            {AUTOMATION_ACTION_LABELS[t]}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <span className="flex-1" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Retirer l'action ${index + 1}`}
                    onClick={() =>
                      setDraft({ ...draft, actions: draft.actions.filter((_, i) => i !== index) })
                    }
                  >
                    <Trash2Icon />
                  </Button>
                </div>
                <ActionFields
                  index={index}
                  action={action}
                  settable={settable}
                  onChange={(a) => setAction(index, a)}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setDraft({ ...draft, actions: [...draft.actions, DEFAULT_ACTIONS.notify] })
              }
              disabled={draft.actions.length >= 10}
            >
              <PlusIcon />
              Ajouter une action
            </Button>
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending || draft.actions.length === 0}>
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ActionFields({
  index,
  action,
  settable,
  onChange,
}: {
  index: number;
  action: AutomationAction;
  settable: ReturnType<typeof entityFields>;
  onChange: (action: AutomationAction) => void;
}) {
  const id = (k: string) => `action-${index}-${k}`;
  switch (action.type) {
    case "notify":
      return (
        <FormField id={id("message")} label="Message au responsable de la fiche">
          <Input
            id={id("message")}
            value={action.message}
            onChange={(e) => onChange({ ...action, message: e.target.value })}
            required
            maxLength={300}
          />
        </FormField>
      );
    case "set_field": {
      const field = settable.find((f) => f.key === action.field);
      return (
        <div className="grid grid-cols-2 gap-3">
          <FormField id={id("field")} label="Champ">
            <Select
              value={action.field}
              onValueChange={(v) => onChange({ ...action, field: v, value: "" })}
            >
              <SelectTrigger id={id("field")}>
                <SelectValue placeholder="Choisir un champ" />
              </SelectTrigger>
              <SelectContent>
                {settable.map((f) => (
                  <SelectItem key={f.key} value={f.key}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField id={id("value")} label="Nouvelle valeur">
            {field?.type === "select" || field?.type === "boolean" ? (
              <Select
                value={String(action.value ?? "")}
                onValueChange={(v) =>
                  onChange({ ...action, value: field.type === "boolean" ? v === "true" : v })
                }
              >
                <SelectTrigger id={id("value")}>
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {(field.type === "boolean"
                    ? [
                        { value: "true", label: "Oui" },
                        { value: "false", label: "Non" },
                      ]
                    : (field.options ?? [])
                  ).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={id("value")}
                type={
                  field?.type === "date" ? "date" : field?.type === "number" ? "number" : "text"
                }
                value={String(action.value ?? "")}
                onChange={(e) =>
                  onChange({
                    ...action,
                    value: field?.type === "number" ? Number(e.target.value) : e.target.value,
                  })
                }
              />
            )}
          </FormField>
        </div>
      );
    }
    case "send_email":
      return (
        <div className="space-y-3">
          <FormField id={id("to")} label="Destinataire">
            <Input
              id={id("to")}
              type="email"
              value={action.to}
              onChange={(e) => onChange({ ...action, to: e.target.value })}
              required
            />
          </FormField>
          <FormField id={id("subject")} label="Objet">
            <Input
              id={id("subject")}
              value={action.subject}
              onChange={(e) => onChange({ ...action, subject: e.target.value })}
              required
            />
          </FormField>
          <FormField id={id("body")} label="Message">
            <Textarea
              id={id("body")}
              rows={4}
              value={action.body}
              onChange={(e) => onChange({ ...action, body: e.target.value })}
              required
            />
          </FormField>
        </div>
      );
    case "create_task":
      return (
        <div className="grid grid-cols-[1fr_140px] gap-3">
          <FormField id={id("title")} label="Titre de la tâche">
            <Input
              id={id("title")}
              value={action.title}
              onChange={(e) => onChange({ ...action, title: e.target.value })}
              required
            />
          </FormField>
          <FormField id={id("due")} label="Échéance (jours)">
            <Input
              id={id("due")}
              type="number"
              min={0}
              max={365}
              value={action.dueInDays}
              onChange={(e) => onChange({ ...action, dueInDays: Number(e.target.value) })}
            />
          </FormField>
        </div>
      );
  }
}
