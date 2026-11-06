"use client";

import { ENTITIES, type EntityKey } from "@quercy/core";
import { Button } from "@quercy/ui/components/button";
import { EmptyState } from "@quercy/ui/components/empty-state";
import { Textarea } from "@quercy/ui/components/textarea";
import { toast } from "@quercy/ui/components/toaster";
import { Tooltip, TooltipContent, TooltipTrigger } from "@quercy/ui/components/tooltip";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpIcon,
  HistoryIcon,
  Loader2Icon,
  PaperclipIcon,
  SparklesIcon,
  SquareIcon,
  SquarePenIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import { toastError } from "@/components/toast-error";
import { parseSse, screenFromPath } from "@/lib/ai-screen";
import type { AiPart, AiTurn } from "@/lib/ai-types";
import { useTRPC } from "@/lib/trpc";

import { useShell } from "../shell/shell-context";
import { useAssistant } from "./assistant-context";
import { type ActionState, Part, type PartHandlers } from "./parts";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp,image/gif";

function suggestionsFor(entity: EntityKey | undefined, recordId: string | undefined): string[] {
  if (entity && recordId) {
    switch (entity) {
      case "company":
      case "contact":
        return [
          "Résume cette fiche : historique, affaires en cours et points d'attention.",
          "Rédige un email de suivi pour ce client.",
        ];
      case "invoice":
        return [
          "Résume cette facture et son historique de paiement.",
          "Rédige une relance courtoise pour cette facture.",
        ];
      case "quote":
        return ["Résume ce devis.", "Rédige un email d'accompagnement pour ce devis."];
      case "project":
        return ["Fais le point sur ce projet : avancement, tâches en retard, temps passé."];
      case "product":
        return ["Rédige une description commerciale de cet article."];
      default:
        return [`Résume cette fiche (${ENTITIES[entity].label.toLowerCase()}).`];
    }
  }
  return [
    "Quel est mon chiffre d'affaires ce mois-ci ?",
    "Montre le chiffre d'affaires des 12 derniers mois, par mois.",
    "Quelles factures sont en retard de plus de 15 jours ?",
    "Relance tous les impayés de plus de 15 jours.",
  ];
}

/** Ajoute un morceau de texte au dernier tour de l'assistant (fusion avec le texte en cours). */
function appendText(parts: AiPart[], delta: string): AiPart[] {
  const last = parts[parts.length - 1];
  if (last?.type === "text")
    return [...parts.slice(0, -1), { type: "text", text: last.text + delta }];
  return [...parts, { type: "text", text: delta }];
}

/** Panneau de l'assistant IA, ancré à droite et ouvert depuis n'importe quel écran (Ctrl+J). */
export function AssistantPanel() {
  const { assistantOpen, setAssistantOpen } = useShell();
  const { focus, pending, setPending } = useAssistant();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [turns, setTurns] = React.useState<AiTurn[]>([]);
  const [actions, setActions] = React.useState<Record<string, ActionState>>({});
  const [busyAction, setBusyAction] = React.useState<string | null>(null);
  const [text, setText] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [stoppable, setStoppable] = React.useState(false);
  const [view, setView] = React.useState<"chat" | "history">("chat");
  const abortRef = React.useRef<AbortController | null>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const endRef = React.useRef<HTMLDivElement>(null);

  const status = useQuery({ ...trpc.ai.status.queryOptions(), enabled: assistantOpen });
  const conversations = useQuery({
    ...trpc.ai.conversations.queryOptions(),
    enabled: assistantOpen && view === "history",
  });

  const fromPath = screenFromPath(pathname);
  const screenEntity = focus?.entity ?? fromPath.entity;
  const screenRecord = focus?.id ?? fromPath.recordId;

  React.useEffect(() => {
    if (assistantOpen && view === "chat") inputRef.current?.focus();
  }, [assistantOpen, view]);
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [turns]);

  const updateLast = (fn: (parts: AiPart[]) => AiPart[]) =>
    setTurns((current) => {
      const last = current[current.length - 1];
      if (!last || last.role !== "assistant") return current;
      return [...current.slice(0, -1), { ...last, parts: fn(last.parts) }];
    });

  const refreshAfter = () => {
    void queryClient.invalidateQueries(trpc.ai.pathFilter());
  };

  async function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || streaming) return;
    setText("");
    setView("chat");
    const at = new Date().toISOString();
    setTurns((t) => [
      ...t,
      { role: "user", parts: [{ type: "text", text: trimmed }], at },
      { role: "assistant", parts: [], at },
    ]);
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    setStoppable(true);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          conversationId,
          text: trimmed,
          screen: {
            path: pathname,
            title: document.title.slice(0, 200),
            ...(screenEntity ? { entity: screenEntity } : {}),
            ...(screenRecord ? { recordId: screenRecord } : {}),
          },
        }),
      });
      if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        updateLast((p) => [
          ...p,
          { type: "notice", tone: "danger", text: body?.error ?? "L'assistant est indisponible." },
        ]);
        return;
      }
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const parsed = parseSse(buffer + value);
        buffer = parsed.rest;
        for (const event of parsed.events) {
          switch (event.type) {
            case "conversation":
              setConversationId(event.id);
              break;
            case "text":
              updateLast((p) => appendText(p, event.delta));
              break;
            case "part":
              updateLast((p) => [...p, event.part]);
              break;
            case "error":
              updateLast((p) =>
                p.some((x) => x.type === "notice" && x.text === event.message)
                  ? p
                  : [...p, { type: "notice", tone: "danger", text: event.message }],
              );
              break;
            case "done":
              break;
          }
        }
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        updateLast((p) => [
          ...p,
          { type: "notice", tone: "danger", text: "La connexion a été interrompue." },
        ]);
      else
        updateLast((p) => [...p, { type: "notice", tone: "info", text: "Réponse interrompue." }]);
    } finally {
      abortRef.current = null;
      setStoppable(false);
      setStreaming(false);
      refreshAfter();
    }
  }

  // Question transmise depuis une fiche (action rapide).
  React.useEffect(() => {
    if (pending && !streaming) {
      setAssistantOpen(true);
      setPending(null);
      void send(pending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- déclenché par une nouvelle question
  }, [pending]);

  async function extract(file: File) {
    if (streaming) return;
    setView("chat");
    const at = new Date().toISOString();
    setTurns((t) => [
      ...t,
      { role: "user", parts: [{ type: "text", text: `Lecture du document « ${file.name} »` }], at },
      {
        role: "assistant",
        parts: [{ type: "tool", name: "extract", label: "Lecture du document" }],
        at,
      },
    ]);
    setStreaming(true);
    try {
      const form = new FormData();
      form.set("file", file);
      if (conversationId) form.set("conversationId", conversationId);
      const response = await fetch("/api/ai/extract", { method: "POST", body: form });
      const body = (await response.json().catch(() => null)) as
        { conversationId: string; part: AiPart; error?: undefined } | { error: string } | null;
      if (!response.ok || !body || "error" in body) {
        updateLast(() => [
          {
            type: "notice",
            tone: "danger",
            text: (body && "error" in body && body.error) || "Le document n'a pas pu être lu.",
          },
        ]);
        return;
      }
      setConversationId(body.conversationId);
      updateLast(() => [body.part]);
    } catch {
      updateLast(() => [
        { type: "notice", tone: "danger", text: "La connexion a été interrompue." },
      ]);
    } finally {
      setStreaming(false);
      refreshAfter();
    }
  }

  const confirm = useMutation(trpc.ai.confirmAction.mutationOptions());
  const reject = useMutation(trpc.ai.rejectAction.mutationOptions());

  const handlers: PartHandlers = {
    actions,
    busyAction,
    live: streaming,
    onConfirm: (id) => {
      setBusyAction(id);
      confirm.mutate(
        { id },
        {
          onSuccess: (result) => {
            if (result.status === "confirmed") {
              setActions((a) => ({ ...a, [id]: { status: "confirmed", result: result.result } }));
              toast.success(result.result.message);
              // Les données ont changé : listes, fiches et tableaux de bord se rechargent.
              void queryClient.invalidateQueries();
              router.refresh();
            } else {
              setActions((a) => ({ ...a, [id]: { status: "failed", error: result.error } }));
              toast.error(result.error);
            }
          },
          onError: toastError,
          onSettled: () => setBusyAction(null),
        },
      );
    },
    onReject: (id) => {
      setBusyAction(id);
      reject.mutate(
        { id },
        {
          onSuccess: () => setActions((a) => ({ ...a, [id]: { status: "rejected" } })),
          onError: toastError,
          onSettled: () => setBusyAction(null),
        },
      );
    },
  };

  function reset() {
    abortRef.current?.abort();
    setConversationId(null);
    setTurns([]);
    setActions({});
    setView("chat");
    inputRef.current?.focus();
  }

  async function open(id: string) {
    try {
      const data = await queryClient.fetchQuery(trpc.ai.conversation.queryOptions({ id }));
      setConversationId(data.id);
      setTurns(data.turns);
      setActions(
        Object.fromEntries(
          Object.entries(data.actions).map(([key, a]): [string, ActionState] => [
            key,
            a.status === "confirmed"
              ? { status: "confirmed", result: a.result }
              : a.status === "failed"
                ? { status: "failed", error: a.error }
                : { status: a.status },
          ]),
        ),
      );
      setView("chat");
    } catch (error) {
      toastError(error);
    }
  }

  const remove = useMutation(
    trpc.ai.deleteConversation.mutationOptions({
      onSuccess: (_data, { id }) => {
        if (id === conversationId) reset();
        void queryClient.invalidateQueries(trpc.ai.conversations.pathFilter());
        toast.success("Conversation supprimée.");
      },
      onError: toastError,
    }),
  );

  const configured = status.data?.configured ?? true;
  const credits = status.data?.credits;
  const outOfCredits = credits ? credits.left <= 0 : false;

  return (
    <aside
      aria-label="Assistant"
      hidden={!assistantOpen}
      className="flex h-full w-[400px] shrink-0 flex-col border-l border-border bg-background 2xl:w-[480px]"
    >
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        <SparklesIcon className="size-4 text-primary" aria-hidden />
        <h2 className="flex-1 truncate text-sm font-semibold">
          {view === "history" ? "Conversations" : "Assistant"}
        </h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={view === "history" ? "subtle" : "ghost"}
              size="icon-sm"
              aria-label="Historique des conversations"
              aria-pressed={view === "history"}
              onClick={() => setView(view === "history" ? "chat" : "history")}
            >
              <HistoryIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Historique</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Nouvelle conversation"
              onClick={reset}
            >
              <SquarePenIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Nouvelle conversation</TooltipContent>
        </Tooltip>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Fermer l'assistant"
          onClick={() => setAssistantOpen(false)}
        >
          <XIcon />
        </Button>
      </header>

      {!configured ? (
        <div className="p-4">
          <EmptyState
            icon={<SparklesIcon />}
            title="Assistant non configuré"
            description="L'assistant IA n'est pas activé sur cette installation : l'administrateur de la plateforme doit renseigner la clé ANTHROPIC_API_KEY."
          />
        </div>
      ) : view === "history" ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {conversations.isPending ? (
            <p className="p-3 text-sm text-muted-foreground">Chargement…</p>
          ) : conversations.data?.length ? (
            <ul className="space-y-0.5">
              {conversations.data.map((c) => (
                <li key={c.id} className="group flex items-center gap-1 rounded-md hover:bg-accent">
                  <button
                    type="button"
                    onClick={() => void open(c.id)}
                    className="min-w-0 flex-1 px-2.5 py-2 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
                  >
                    <span className="block truncate text-sm">{c.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("fr-FR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(c.updatedAt)}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Supprimer la conversation « ${c.title} »`}
                    onClick={() => remove.mutate({ id: c.id })}
                    className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <Trash2Icon />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-3 text-sm text-muted-foreground">Aucune conversation pour l'instant.</p>
          )}
        </div>
      ) : (
        <>
          <div
            role="log"
            aria-live="polite"
            className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
          >
            {turns.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Posez une question sur vos données, demandez un texte ou une action : rien n'est
                  modifié sans votre confirmation.
                </p>
                <div className="flex flex-col gap-1.5">
                  {suggestionsFor(screenEntity, screenRecord).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      disabled={outOfCredits}
                      className="rounded-md border border-border px-3 py-2 text-left text-sm transition-colors outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              turns.map((turn, index) =>
                turn.role === "user" ? (
                  <div key={index} className="flex justify-end">
                    <p className="max-w-[85%] rounded-lg bg-primary/10 px-3 py-2 text-sm whitespace-pre-wrap">
                      {turn.parts.map((p) => (p.type === "text" ? p.text : "")).join("")}
                    </p>
                  </div>
                ) : (
                  <div key={index} className="space-y-3">
                    {turn.parts.map((part, i) => (
                      <Part
                        key={i}
                        part={part}
                        handlers={handlers}
                        last={index === turns.length - 1 && i === turn.parts.length - 1}
                      />
                    ))}
                    {streaming && index === turns.length - 1 && turn.parts.length === 0 ? (
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2Icon className="size-3 animate-spin" aria-hidden />
                        Réflexion…
                      </p>
                    ) : null}
                  </div>
                ),
              )
            )}
            <div ref={endRef} />
          </div>

          <form
            className="shrink-0 space-y-1.5 border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send(text);
            }}
          >
            <Textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void send(text);
                }
              }}
              rows={3}
              maxLength={8000}
              placeholder="Votre question ou votre demande…"
              aria-label="Message à l'assistant"
              disabled={outOfCredits}
              className="resize-none"
            />
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                tabIndex={-1}
                aria-label="Document à lire"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void extract(file);
                }}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Lire une facture ou un justificatif"
                    disabled={streaming || outOfCredits}
                    onClick={() => fileRef.current?.click()}
                  >
                    <PaperclipIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Lire une facture ou un justificatif (PDF, photo)</TooltipContent>
              </Tooltip>
              <p className="flex-1 truncate text-xs text-muted-foreground">
                {credits
                  ? outOfCredits
                    ? "Crédits du mois épuisés."
                    : `${credits.left} crédit${credits.left > 1 ? "s" : ""} restant${credits.left > 1 ? "s" : ""} ce mois-ci`
                  : ""}
              </p>
              {stoppable ? (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="secondary"
                  aria-label="Arrêter la réponse"
                  onClick={() => abortRef.current?.abort()}
                >
                  <SquareIcon />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon-sm"
                  aria-label="Envoyer"
                  disabled={!text.trim() || streaming || outOfCredits}
                >
                  <ArrowUpIcon />
                </Button>
              )}
            </div>
          </form>
        </>
      )}
    </aside>
  );
}
