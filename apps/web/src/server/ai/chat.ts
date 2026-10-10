import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { AI_CREDIT_COST, AI_MAX_TOOL_ROUNDS, type AiScreenContext } from "@quercy/core";
import type { Prisma } from "@quercy/db";
import { prisma } from "@quercy/db";

import type { AiPart, AiStreamEvent, AiTurn } from "@/lib/ai-types";

import type { ResolvedWorkspace } from "../workspace";
import { FALLBACK_BETA, aiEffort, aiModel, anthropic } from "./client";
import { SYSTEM_PROMPT, contextBlock } from "./prompt";
import { type Caller, TOOL_DEFINITIONS, TOOL_LABELS, runTool } from "./tools";
import { aiCredits, creditsExhaustedMessage, recordUsage } from "./usage";

type Message = Anthropic.Beta.BetaMessageParam;

/** Nombre de questions précédentes renvoyées au modèle (le reste reste affiché). */
const HISTORY_TURNS = 12;
const MAX_TOKENS = 16_000;

export interface ChatInput {
  workspace: ResolvedWorkspace;
  user: { id: string; name: string };
  caller: Caller;
  conversationId: string | null;
  text: string;
  screen: AiScreenContext | null;
  emit: (event: AiStreamEvent) => void;
  signal?: AbortSignal;
}

/** Début d'une question de la personne (et non un retour d'outils). */
function isQuestion(message: Message): boolean {
  if (message.role !== "user") return false;
  if (typeof message.content === "string") return true;
  return !message.content.some((b) => b.type === "tool_result");
}

/** Garde les dernières questions complètes : l'historique renvoyé reste valide et borné. */
export function trimHistory(messages: Message[], turns = HISTORY_TURNS): Message[] {
  const starts = messages.flatMap((m, i) => (isQuestion(m) ? [i] : []));
  if (starts.length <= turns) return messages;
  return messages.slice(starts[starts.length - turns]);
}

export function conversationTitle(text: string): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > 60 ? `${oneLine.slice(0, 57)}…` : oneLine;
}

/** Comptes rendus des actions décidées depuis le dernier échange (confirmées, refusées…). */
async function actionNotes(conversationId: string, since: Date): Promise<string[]> {
  const actions = await prisma.aiAction.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
  return actions.flatMap((a) => {
    const summary = a.summary.split("\n")[0];
    if (a.status === "pending")
      return [`Action ${a.id} (« ${summary} ») : toujours en attente de confirmation.`];
    if (!a.decidedAt || a.decidedAt <= since) return [];
    if (a.status === "confirmed") {
      const result = a.result as { message?: string; url?: string } | null;
      return [
        `Action ${a.id} (« ${summary} ») : confirmée et exécutée. ${result?.message ?? ""}${result?.url ? ` Lien : ${result.url}` : ""}`,
      ];
    }
    if (a.status === "rejected")
      return [
        `Action ${a.id} (« ${summary} ») : refusée par la personne, ne pas la refaire sans nouvelle demande.`,
      ];
    return [`Action ${a.id} (« ${summary} ») : a échoué (${a.error ?? "erreur"}).`];
  });
}

function apiErrorMessage(error: unknown): string {
  if (error instanceof Anthropic.RateLimitError)
    return "L'assistant est très sollicité en ce moment. Réessayez dans quelques instants.";
  if (
    error instanceof Anthropic.AuthenticationError ||
    error instanceof Anthropic.PermissionDeniedError
  )
    return "La clé d'API de l'assistant est invalide. Prévenez l'administrateur de la plateforme.";
  if (error instanceof Anthropic.APIConnectionError)
    return "Le service de l'assistant est injoignable. Réessayez dans quelques instants.";
  if (error instanceof Anthropic.APIError)
    return "Le service de l'assistant a renvoyé une erreur. Réessayez dans quelques instants.";
  return "Une erreur inattendue a interrompu la réponse.";
}

/**
 * Traite une question : appelle le modèle en streaming, exécute les outils de lecture,
 * enregistre les actions proposées (à confirmer), puis sauvegarde la conversation.
 * Un crédit par question, quel que soit le nombre d'étapes d'outils.
 */
export async function runChat(input: ChatInput): Promise<void> {
  const { workspace, user, caller, emit } = input;
  const organizationId = workspace.organization.id;

  const credits = await aiCredits(workspace);
  if (credits.left < AI_CREDIT_COST.chat) {
    emit({ type: "error", message: creditsExhaustedMessage("chat") });
    return;
  }

  const existing = input.conversationId
    ? await prisma.aiConversation.findFirst({
        where: { id: input.conversationId, organizationId, userId: user.id },
      })
    : null;
  if (input.conversationId && !existing) {
    emit({ type: "error", message: "Cette conversation n'existe plus." });
    return;
  }
  const conversation =
    existing ??
    (await prisma.aiConversation.create({
      data: { organizationId, userId: user.id, title: conversationTitle(input.text) },
    }));
  emit({ type: "conversation", id: conversation.id, title: conversation.title });

  const history = (conversation.messages as unknown as Message[]) ?? [];
  const display = (conversation.display as unknown as AiTurn[]) ?? [];
  const notes = existing ? await actionNotes(conversation.id, existing.updatedAt) : [];

  const question: Message = {
    role: "user",
    content: [
      {
        type: "text",
        text: contextBlock({
          organization: workspace.organization.name,
          user: user.name,
          role: workspace.role.name,
          timeZone: workspace.organization.preferences.timezone,
          screen: input.screen,
          notes,
        }),
      },
      { type: "text", text: input.text },
    ],
  };
  const messages: Message[] = [...trimHistory(history), question];
  const appended: Message[] = [question];

  const parts: AiPart[] = [];
  let buffer = "";
  const flush = () => {
    if (buffer.trim()) parts.push({ type: "text", text: buffer });
    buffer = "";
  };
  const show = (part: AiPart) => {
    flush();
    parts.push(part);
    emit({ type: "part", part });
  };

  const model = aiModel();
  let inputTokens = 0;
  let outputTokens = 0;
  let answered = false;
  let failed: string | null = null;

  const propose = async (tool: string, toolInput: unknown, summary: string) => {
    const action = await prisma.aiAction.create({
      data: {
        organizationId,
        userId: user.id,
        conversationId: conversation.id,
        tool,
        input: toolInput as Prisma.InputJsonValue,
        summary,
      },
    });
    return action.id;
  };

  try {
    for (let round = 0; round < AI_MAX_TOOL_ROUNDS; round++) {
      const stream = anthropic().beta.messages.stream(
        {
          model,
          max_tokens: MAX_TOKENS,
          system: SYSTEM_PROMPT,
          tools: TOOL_DEFINITIONS,
          messages,
          output_config: { effort: aiEffort() },
          cache_control: { type: "ephemeral" },
          fallbacks: "default",
          betas: [FALLBACK_BETA],
        },
        { signal: input.signal },
      );
      stream.on("text", (delta) => {
        buffer += delta;
        emit({ type: "text", delta });
      });
      const message = await stream.finalMessage();
      answered = true;
      inputTokens +=
        message.usage.input_tokens +
        (message.usage.cache_creation_input_tokens ?? 0) +
        (message.usage.cache_read_input_tokens ?? 0);
      outputTokens += message.usage.output_tokens;

      const assistant: Message = { role: "assistant", content: message.content };
      messages.push(assistant);
      appended.push(assistant);

      if (message.stop_reason === "refusal") {
        show({
          type: "notice",
          tone: "warning",
          text: "L'assistant ne peut pas répondre à cette demande.",
        });
        break;
      }
      if (message.stop_reason === "max_tokens") {
        show({
          type: "notice",
          tone: "warning",
          text: "La réponse a été tronquée car trop longue. Précisez la question.",
        });
        break;
      }
      if (message.stop_reason === "pause_turn") continue;
      if (message.stop_reason !== "tool_use") break;

      const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      for (const block of message.content) {
        if (block.type !== "tool_use") continue;
        show({ type: "tool", name: block.name, label: TOOL_LABELS[block.name] ?? block.name });
        const outcome = await runTool(block.name, block.input, {
          caller,
          workspace,
          propose,
        });
        if (outcome.part) show(outcome.part);
        results.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: outcome.content,
          ...(outcome.isError ? { is_error: true } : {}),
        });
      }
      const toolTurn: Message = { role: "user", content: results };
      messages.push(toolTurn);
      appended.push(toolTurn);

      if (round === AI_MAX_TOOL_ROUNDS - 1)
        show({
          type: "notice",
          tone: "warning",
          text: "La question demandait trop d'étapes : reformulez-la plus simplement.",
        });
    }
  } catch (error) {
    if (!(error instanceof Anthropic.APIUserAbortError)) {
      failed = apiErrorMessage(error);
      if (!(error instanceof Anthropic.APIError)) console.error(error);
    }
  }
  flush();

  // L'historique envoyé au modèle doit rester valide : en cas d'échec, on garde seulement
  // les échanges complets (se terminant par une réponse de l'assistant sans outil en attente).
  let kept = appended;
  if (
    failed ||
    kept[kept.length - 1]?.role !== "assistant" ||
    hasPendingTool(kept[kept.length - 1]!)
  ) {
    kept = [];
  }
  if (failed) parts.push({ type: "notice", tone: "danger", text: failed });

  const now = new Date().toISOString();
  const turns: AiTurn[] = [
    ...display,
    { role: "user", parts: [{ type: "text", text: input.text }], at: now },
    { role: "assistant", parts, at: now },
  ];
  await prisma.aiConversation.update({
    where: { id: conversation.id },
    data: {
      messages: [...history, ...kept] as unknown as Prisma.InputJsonValue,
      display: turns as unknown as Prisma.InputJsonValue,
    },
  });

  if (answered)
    await recordUsage({
      organizationId,
      userId: user.id,
      kind: "chat",
      model,
      inputTokens,
      outputTokens,
    });
  if (failed) emit({ type: "error", message: failed });
  emit({
    type: "done",
    creditsUsed: answered ? AI_CREDIT_COST.chat : 0,
    creditsLeft: Math.max(0, credits.left - (answered ? AI_CREDIT_COST.chat : 0)),
  });
}

function hasPendingTool(message: Message): boolean {
  return typeof message.content !== "string" && message.content.some((b) => b.type === "tool_use");
}
