"use client";

import type { EntityKey } from "@quercy/core";
import { Avatar, AvatarFallback, initials } from "@quercy/ui/components/avatar";
import { Button } from "@quercy/ui/components/button";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { Textarea } from "@quercy/ui/components/textarea";
import { toast } from "@quercy/ui/components/toaster";
import { cn } from "@quercy/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquareIcon, Trash2Icon } from "lucide-react";
import * as React from "react";

import { toastError } from "@/components/toast-error";
import { useTRPC } from "@/lib/trpc";

import { useUserOptions } from "./field-editor";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

/** Rendu d'un commentaire : les mentions « @[Nom](id) » deviennent des pastilles. */
function CommentBody({ body }: { body: string }) {
  const parts = body.split(/(@\[[^\]]+\]\([a-z0-9]+\))/gi);
  return (
    <p className="text-sm whitespace-pre-wrap">
      {parts.map((part, i) => {
        const mention = /^@\[([^\]]+)\]\(([a-z0-9]+)\)$/i.exec(part);
        return mention ? (
          <span key={i} className="rounded-sm bg-primary/10 px-1 font-medium text-primary">
            @{mention[1]}
          </span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        );
      })}
    </p>
  );
}

/** Commentaires avec @mentions (la personne mentionnée reçoit une notification). */
export function CommentsTab({ entity, id }: { entity: EntityKey; id: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const comments = useQuery(trpc.comments.list.queryOptions({ entity, id }));
  const users = useUserOptions();
  const [draft, setDraft] = React.useState("");
  const [mentionQuery, setMentionQuery] = React.useState<string | null>(null);
  const [active, setActive] = React.useState(0);
  const textarea = React.useRef<HTMLTextAreaElement>(null);
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: trpc.comments.list.queryKey({ entity, id }) });
  const create = useMutation(
    trpc.comments.create.mutationOptions({
      onSuccess: () => {
        setDraft("");
        void invalidate();
      },
      onError: toastError,
    }),
  );
  const remove = useMutation(
    trpc.comments.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Commentaire supprimé.");
        void invalidate();
      },
      onError: toastError,
    }),
  );

  // Avertit avant de quitter la page avec un commentaire non envoyé.
  React.useEffect(() => {
    if (!draft.trim()) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [draft]);

  const suggestions =
    mentionQuery === null
      ? []
      : (users.data ?? [])
          .filter((u) => u.label.toLowerCase().includes(mentionQuery.toLowerCase()))
          .slice(0, 6);

  function onChange(value: string) {
    setDraft(value);
    const caret = textarea.current?.selectionStart ?? value.length;
    const match = /(^|\s)@([\p{L}\p{N}.-]*)$/u.exec(value.slice(0, caret));
    setMentionQuery(match ? match[2]! : null);
    setActive(0);
  }

  function insertMention(user: { value: string; label: string }) {
    const el = textarea.current;
    const caret = el?.selectionStart ?? draft.length;
    const before = draft
      .slice(0, caret)
      .replace(/@([\p{L}\p{N}.-]*)$/u, `@[${user.label}](${user.value}) `);
    const next = before + draft.slice(caret);
    setDraft(next);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(before.length, before.length);
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => (a + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => (a - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(suggestions[active]!);
        return;
      }
      if (e.key === "Escape") {
        setMentionQuery(null);
        return;
      }
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && draft.trim()) {
      e.preventDefault();
      create.mutate({ entity, id, body: draft });
    }
  }

  return (
    <div className="space-y-4">
      {comments.isPending ? (
        <Skeleton className="h-16" />
      ) : comments.data && comments.data.length > 0 ? (
        <ol className="space-y-4">
          {comments.data.map((c) => (
            <li key={c.id} className="group flex gap-3">
              <Avatar className="mt-0.5">
                <AvatarFallback>{initials(c.author.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{c.author.name}</span> ·{" "}
                  {dateFmt.format(new Date(c.createdAt))}
                  {c.editedAt ? " · modifié" : ""}
                </p>
                <CommentBody body={c.body} />
              </div>
              {c.mine ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  onClick={() => remove.mutate({ commentId: c.id })}
                  aria-label="Supprimer le commentaire"
                >
                  <Trash2Icon />
                </Button>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageSquareIcon className="size-4" /> Aucun commentaire. Tapez @ pour mentionner
          quelqu&apos;un.
        </p>
      )}
      <form
        className="relative space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) create.mutate({ entity, id, body: draft });
        }}
      >
        <Textarea
          ref={textarea}
          value={draft}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Écrire un commentaire… (@ pour mentionner, Ctrl+Entrée pour envoyer)"
          aria-label="Nouveau commentaire"
          className="min-h-20"
        />
        {suggestions.length > 0 ? (
          <ul
            role="listbox"
            aria-label="Personnes à mentionner"
            className="absolute bottom-full left-0 z-20 mb-1 w-64 rounded-lg border border-border bg-popover p-1 shadow-md"
          >
            {suggestions.map((u, i) => (
              <li
                key={u.value}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(u);
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                  i === active && "bg-accent",
                )}
              >
                <Avatar className="size-5">
                  <AvatarFallback className="text-[9px]">{initials(u.label)}</AvatarFallback>
                </Avatar>
                {u.label}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={!draft.trim() || create.isPending}>
            Commenter
          </Button>
        </div>
      </form>
    </div>
  );
}
