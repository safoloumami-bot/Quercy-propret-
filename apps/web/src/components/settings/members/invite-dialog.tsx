"use client";

import { emailSchema } from "@quercy/core";
import { Button } from "@quercy/ui/components/button";
import { Callout } from "@quercy/ui/components/callout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@quercy/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@quercy/ui/components/select";
import { Textarea } from "@quercy/ui/components/textarea";
import { toast } from "@quercy/ui/components/toaster";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, CopyIcon } from "lucide-react";
import * as React from "react";

import { FormField } from "@/components/form-field";
import { errorMessage, useTRPC } from "@/lib/trpc";

/** Découpe une saisie libre (virgules, espaces, retours à la ligne) en adresses. */
export function parseEmails(raw: string): { valid: string[]; invalid: string[] } {
  const parts = raw
    .split(/[\s,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const part of parts) {
    const parsed = emailSchema.safeParse(part);
    if (parsed.success) {
      if (!valid.includes(parsed.data)) valid.push(parsed.data);
    } else invalid.push(part);
  }
  return { valid, invalid };
}

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() =>
        navigator.clipboard.writeText(url).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        })
      }
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? "Copié" : "Copier le lien"}
    </Button>
  );
}

export function InviteDialog({
  open,
  onOpenChange,
  roles,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: { id: string; name: string; systemKey: string | null }[];
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const invitable = roles.filter((r) => r.systemKey !== "owner");
  const defaultRole = invitable.find((r) => r.systemKey === "member")?.id ?? invitable[0]?.id ?? "";
  const [raw, setRaw] = React.useState("");
  const [roleId, setRoleId] = React.useState(defaultRole);
  const [results, setResults] = React.useState<
    { email: string; status: string; url?: string }[] | null
  >(null);
  const invite = useMutation(trpc.invitations.create.mutationOptions());
  const { valid, invalid } = parseEmails(raw);

  React.useEffect(() => {
    if (!roleId && defaultRole) setRoleId(defaultRole);
  }, [roleId, defaultRole]);

  function reset(nextOpen: boolean) {
    if (!nextOpen) {
      setRaw("");
      setResults(null);
      invite.reset();
    }
    onOpenChange(nextOpen);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    invite.mutate(
      { emails: valid, roleId },
      {
        onSuccess: async (data) => {
          setResults(data);
          await queryClient.invalidateQueries({ queryKey: trpc.invitations.list.queryKey() });
          const sent = data.filter((d) => d.status === "invited").length;
          if (sent > 0)
            toast.success(sent > 1 ? `${sent} invitations envoyées.` : "Invitation envoyée.");
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="max-w-xl">
        {results ? (
          <div className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Invitations envoyées</DialogTitle>
              <DialogDescription>
                Chaque personne reçoit un email. Vous pouvez aussi partager le lien directement
                (valable 7 jours).
              </DialogDescription>
            </DialogHeader>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {results.map((r) => (
                <li
                  key={r.email}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <span className="truncate">{r.email}</span>
                  {r.url ? (
                    <CopyLinkButton url={r.url} />
                  ) : (
                    <span className="text-muted-foreground">Déjà membre</span>
                  )}
                </li>
              ))}
            </ul>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setResults(null)}>
                Inviter d&apos;autres personnes
              </Button>
              <Button onClick={() => reset(false)}>Terminé</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Inviter des personnes</DialogTitle>
              <DialogDescription>
                Collez une ou plusieurs adresses, séparées par des virgules ou des retours à la
                ligne.
              </DialogDescription>
            </DialogHeader>
            {invite.error ? <Callout variant="danger">{errorMessage(invite.error)}</Callout> : null}
            <FormField
              id="invite-emails"
              label="Adresses email"
              error={
                invalid.length > 0 ? `Adresse(s) invalide(s) : ${invalid.join(", ")}` : undefined
              }
              hint={valid.length > 0 ? `${valid.length} adresse(s) valide(s).` : undefined}
            >
              <Textarea
                id="invite-emails"
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder={"marie@dupont.fr, paul@dupont.fr"}
                autoFocus
                aria-invalid={invalid.length > 0 || undefined}
              />
            </FormField>
            <FormField id="invite-role" label="Rôle">
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger id="invite-role">
                  <SelectValue placeholder="Choisir un rôle" />
                </SelectTrigger>
                <SelectContent>
                  {invitable.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => reset(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={valid.length === 0 || invalid.length > 0 || !roleId || invite.isPending}
              >
                {invite.isPending
                  ? "Envoi…"
                  : valid.length > 1
                    ? `Inviter ${valid.length} personnes`
                    : "Envoyer l'invitation"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
