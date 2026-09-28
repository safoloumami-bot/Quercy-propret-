"use client";

import {
  AUTOMATION_TRIGGERS,
  ENTITIES,
  ENTITY_KEYS,
  type EntityKey,
  TRIGGER_LABELS,
  eventName,
} from "@quercy/core";
import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import { Checkbox } from "@quercy/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@quercy/ui/components/dialog";
import { Input } from "@quercy/ui/components/input";
import { Label } from "@quercy/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@quercy/ui/components/select";
import { toast } from "@quercy/ui/components/toaster";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarPlusIcon,
  CopyIcon,
  KeyRoundIcon,
  PlusIcon,
  SendIcon,
  Trash2Icon,
  WebhookIcon,
} from "lucide-react";
import * as React from "react";

import { FormField } from "@/components/form-field";
import { PageHeader } from "@/components/page-header";
import { useAccess } from "@/components/shell/access-context";
import { toastError } from "@/components/toast-error";
import { useTRPC } from "@/lib/trpc";

const dateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });

function copy(text: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => toast.success("Copié dans le presse-papiers."))
    .catch(() => toast.error("Copie impossible : autorisez l'accès au presse-papiers."));
}

/** Secret ou clé affiché une seule fois. */
function Reveal({
  title,
  value,
  onClose,
  hint,
}: {
  title: string;
  value: string | null;
  onClose: () => void;
  hint: string;
}) {
  return (
    <Dialog open={value !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{hint}</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input readOnly value={value ?? ""} aria-label={title} className="font-mono text-xs" />
          <Button variant="secondary" onClick={() => value && copy(value)} aria-label="Copier">
            <CopyIcon />
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>J'ai copié la valeur</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function IntegrationsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { allows } = useAccess();
  const data = useQuery(trpc.integrations.overview.queryOptions());
  const refresh = () => queryClient.invalidateQueries(trpc.integrations.pathFilter());
  const [revealed, setRevealed] = React.useState<{
    title: string;
    value: string;
    hint: string;
  } | null>(null);
  const [keyDialog, setKeyDialog] = React.useState(false);
  const [hookDialog, setHookDialog] = React.useState(false);
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const createKey = useMutation(
    trpc.integrations.createKey.mutationOptions({ onError: toastError }),
  );
  const revokeKey = useMutation(
    trpc.integrations.revokeKey.mutationOptions({
      onSuccess: () => {
        toast.success("Clé révoquée.");
        void refresh();
      },
      onError: toastError,
    }),
  );
  const saveHook = useMutation(
    trpc.integrations.saveWebhook.mutationOptions({ onError: toastError }),
  );
  const deleteHook = useMutation(
    trpc.integrations.deleteWebhook.mutationOptions({
      onSuccess: () => {
        toast.success("Webhook supprimé.");
        void refresh();
      },
      onError: toastError,
    }),
  );
  const testHook = useMutation(
    trpc.integrations.testWebhook.mutationOptions({
      onSuccess: () => {
        toast.success("Évènement de test envoyé.");
        setTimeout(() => void refresh(), 1500);
      },
      onError: toastError,
    }),
  );
  const revealSecret = useMutation(
    trpc.integrations.webhookSecret.mutationOptions({
      onSuccess: ({ secret }) =>
        setRevealed({
          title: "Secret de signature",
          value: secret,
          hint: "Vérifiez l'en-tête X-Quercy-Signature avec ce secret.",
        }),
      onError: toastError,
    }),
  );

  const calendarLink = () =>
    createKey.mutate(
      { name: "Abonnement agenda (iCal)", scope: "read" },
      {
        onSuccess: ({ key }) => {
          void refresh();
          setRevealed({
            title: "Lien d'abonnement à l'agenda",
            value: `${origin}/api/v1/agenda.ics?key=${key}`,
            hint: "Ajoutez ce lien dans Google Agenda (« À partir de l'URL »), Outlook ou Apple Calendrier. Il ne sera plus affiché ; révoquez la clé pour le couper.",
          });
        },
      },
    );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 px-8 py-8">
      <PageHeader
        title="Intégrations"
        description="Connectez Quercy à vos autres outils : API REST, webhooks et abonnement d'agenda. Pour Zapier, Make ou n8n, utilisez une clé d'API et des webhooks."
      />

      <section aria-labelledby="api-title" className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="api-title" className="text-lg font-semibold">
              API REST
            </h2>
            <p className="text-sm text-muted-foreground">
              Documentation OpenAPI :{" "}
              <a
                className="font-medium text-primary hover:underline"
                href="/api/v1/openapi.json"
                target="_blank"
                rel="noreferrer"
              >
                /api/v1/openapi.json
              </a>{" "}
              · exemple :{" "}
              <code className="rounded bg-muted px-1 text-xs">
                curl -H "Authorization: Bearer qk_…" {origin}/api/v1/company
              </code>
            </p>
          </div>
          <Button onClick={() => setKeyDialog(true)}>
            <KeyRoundIcon />
            Nouvelle clé
          </Button>
        </div>
        {data.data?.keys.length ? (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {data.data.keys.map((k) => (
              <li key={k.id} className="flex items-center gap-4 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{k.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <code>{k.prefix}…</code> · créée par {k.owner} ·{" "}
                    {k.lastUsedAt
                      ? `utilisée le ${dateTime.format(k.lastUsedAt)}`
                      : "jamais utilisée"}
                  </p>
                </div>
                <Badge variant={k.scope === "write" ? "warning" : "neutral"}>
                  {k.scope === "write" ? "Lecture et écriture" : "Lecture seule"}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => revokeKey.mutate({ id: k.id })}>
                  Révoquer
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune clé d'API active.</p>
        )}
      </section>

      <section aria-labelledby="hooks-title" className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="hooks-title" className="text-lg font-semibold">
              Webhooks
            </h2>
            <p className="text-sm text-muted-foreground">
              Chaque évènement est envoyé en POST (JSON), signé, avec jusqu'à 5 tentatives.
            </p>
          </div>
          <Button onClick={() => setHookDialog(true)}>
            <WebhookIcon />
            Nouveau webhook
          </Button>
        </div>
        {data.data?.webhooks.length ? (
          <ul className="space-y-2">
            {data.data.webhooks.map((h) => (
              <li key={h.id} className="space-y-2 rounded-lg border border-border p-4 text-sm">
                <div className="flex items-center gap-3">
                  <p className="min-w-0 flex-1 truncate font-mono text-xs">{h.url}</p>
                  <Badge>
                    {h.events.length} évènement{h.events.length > 1 ? "s" : ""}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => testHook.mutate({ id: h.id })}>
                    <SendIcon />
                    Tester
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revealSecret.mutate({ id: h.id })}
                  >
                    Secret
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Supprimer le webhook ${h.url}`}
                    onClick={() => deleteHook.mutate({ id: h.id })}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
                {h.deliveries.length ? (
                  <ul className="space-y-0.5 text-xs text-muted-foreground">
                    {h.deliveries.map((d) => (
                      <li key={d.id} className="flex gap-2">
                        <span
                          className={
                            d.status === "delivered"
                              ? "text-success"
                              : d.status === "failed"
                                ? "text-destructive"
                                : ""
                          }
                        >
                          {d.status === "delivered"
                            ? "Livré"
                            : d.status === "failed"
                              ? "Échec"
                              : "En attente"}
                          {d.statusCode ? ` (${d.statusCode})` : ""}
                        </span>
                        <span>{d.event}</span>
                        <span>{dateTime.format(d.createdAt)}</span>
                        {d.error ? <span>— {d.error}</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun webhook.</p>
        )}
      </section>

      {allows("calendar", "view") ? (
        <section aria-labelledby="calendar-title" className="space-y-3">
          <h2 id="calendar-title" className="text-lg font-semibold">
            Agenda
          </h2>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4 text-sm">
            <p className="text-muted-foreground">
              Abonnez Google Agenda, Outlook ou Apple Calendrier aux évènements de l'agenda Quercy
              (90 jours passés et 12 mois à venir, selon vos droits).
            </p>
            <Button variant="secondary" onClick={calendarLink} disabled={createKey.isPending}>
              <CalendarPlusIcon />
              Obtenir le lien d'abonnement
            </Button>
          </div>
        </section>
      ) : null}

      <KeyDialog
        open={keyDialog}
        onOpenChange={setKeyDialog}
        pending={createKey.isPending}
        onCreate={(name, scope) =>
          createKey.mutate(
            { name, scope },
            {
              onSuccess: ({ key }) => {
                setKeyDialog(false);
                void refresh();
                setRevealed({
                  title: "Nouvelle clé d'API",
                  value: key,
                  hint: "Copiez-la maintenant : elle ne sera plus affichée.",
                });
              },
            },
          )
        }
      />
      <WebhookDialog
        open={hookDialog}
        onOpenChange={setHookDialog}
        pending={saveHook.isPending}
        onCreate={(url, events) =>
          saveHook.mutate(
            { url, events, active: true },
            {
              onSuccess: ({ secret }) => {
                setHookDialog(false);
                void refresh();
                if (secret)
                  setRevealed({
                    title: "Secret de signature",
                    value: secret,
                    hint: "Vérifiez l'en-tête X-Quercy-Signature avec ce secret.",
                  });
              },
            },
          )
        }
      />
      <Reveal
        title={revealed?.title ?? ""}
        value={revealed?.value ?? null}
        hint={revealed?.hint ?? ""}
        onClose={() => setRevealed(null)}
      />
    </div>
  );
}

function KeyDialog({
  open,
  onOpenChange,
  onCreate,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (name: string, scope: "read" | "write") => void;
  pending: boolean;
}) {
  const [name, setName] = React.useState("");
  const [scope, setScope] = React.useState<"read" | "write">("read");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle clé d'API</DialogTitle>
          <DialogDescription>La clé agit avec vos droits actuels dans l'espace.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onCreate(name, scope);
          }}
        >
          <FormField id="key-name" label="Nom">
            <Input
              id="key-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
              placeholder="Zapier, site web…"
            />
          </FormField>
          <FormField id="key-scope" label="Accès">
            <Select value={scope} onValueChange={(v) => setScope(v as "read" | "write")}>
              <SelectTrigger id="key-scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read">Lecture seule</SelectItem>
                <SelectItem value="write">Lecture et écriture</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              <PlusIcon />
              Créer la clé
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WebhookDialog({
  open,
  onOpenChange,
  onCreate,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (url: string, events: string[]) => void;
  pending: boolean;
}) {
  const { allows } = useAccess();
  const [url, setUrl] = React.useState("");
  const [entities, setEntities] = React.useState<EntityKey[]>([]);
  const [triggers, setTriggers] = React.useState<string[]>(["created", "updated"]);
  const available = ENTITY_KEYS.filter((k) => allows(ENTITIES[k].module, "view"));
  const toggle = <T,>(list: T[], item: T) =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
  const events = entities.flatMap((e) =>
    triggers.map((t) => eventName(e, t as (typeof AUTOMATION_TRIGGERS)[number])),
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau webhook</DialogTitle>
          <DialogDescription>Adresse HTTPS appelée à chaque évènement choisi.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onCreate(url, events);
          }}
        >
          <FormField id="hook-url" label="Adresse">
            <Input
              id="hook-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              placeholder="https://exemple.fr/webhooks/quercy"
            />
          </FormField>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Évènements</legend>
            <div className="flex gap-4">
              {AUTOMATION_TRIGGERS.map((t) => (
                <Label key={t} className="flex items-center gap-2 font-normal">
                  <Checkbox
                    checked={triggers.includes(t)}
                    onCheckedChange={() => setTriggers(toggle(triggers, t))}
                  />
                  {TRIGGER_LABELS[t]}
                </Label>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Fiches</legend>
            <div className="grid grid-cols-3 gap-2">
              {available.map((k) => (
                <Label key={k} className="flex items-center gap-2 font-normal">
                  <Checkbox
                    checked={entities.includes(k)}
                    onCheckedChange={() => setEntities(toggle(entities, k))}
                  />
                  {ENTITIES[k].labelPlural}
                </Label>
              ))}
            </div>
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending || events.length === 0}>
              Créer le webhook
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
