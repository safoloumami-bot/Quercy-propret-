/**
 * Faux service de l'API Claude (Messages), pour les tests et les parcours E2E : réponses
 * scriptées et déterministes, au format réel (flux SSE ou JSON). Jamais utilisé en production.
 *
 *   tsx scripts/fake-anthropic.ts 4010   → ANTHROPIC_BASE_URL=http://localhost:4010
 */
import { type IncomingMessage, type Server, type ServerResponse, createServer } from "node:http";

type Block =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: unknown; is_error?: boolean }
  | { type: string; [key: string]: unknown };
interface Message {
  role: "user" | "assistant";
  content: string | Block[];
}
interface Body {
  model: string;
  stream?: boolean;
  messages: Message[];
  output_config?: { format?: unknown };
}

export interface RecordedRequest {
  headers: Record<string, string | string[] | undefined>;
  body: Body;
}

type Reply =
  | { kind: "text"; text: string }
  | { kind: "tool"; name: string; input: unknown; text?: string }
  | { kind: "refusal" }
  | { kind: "error"; status: number };

const blocks = (m: Message): Block[] =>
  typeof m.content === "string" ? [{ type: "text", text: m.content }] : m.content;

const isQuestion = (m: Message) =>
  m.role === "user" && !blocks(m).some((b) => b.type === "tool_result");

function resultJson(block: Block | undefined): Record<string, unknown> {
  if (!block || block.type !== "tool_result") return {};
  try {
    return JSON.parse(String(block.content)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Réponse scriptée selon la question et l'étape (nombre de retours d'outils déjà reçus). */
export function scriptedReply(messages: Message[]): Reply {
  const start = messages.findLastIndex(isQuestion);
  const question = blocks(messages[start]!)
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const asked = question.split("</contexte_application>").pop()!.toLowerCase();
  const step = messages.slice(start + 1).filter((m) => m.role === "user").length;
  const last = blocks(messages[messages.length - 1]!).find((b) => b.type === "tool_result");
  const result = resultJson(last);

  if (asked.includes("erreur de service")) return { kind: "error", status: 500 };
  if (asked.includes("interdit")) return { kind: "refusal" };

  if (asked.includes("chiffre d'affaires")) {
    if (step === 0)
      return {
        kind: "tool",
        name: "run_report",
        text: "Je calcule le chiffre d'affaires.",
        input: {
          entity: "invoice",
          measure: "sum",
          measureField: "totalExclCents",
          groupBy: "issueDate",
          dateBucket: "month",
          dateField: "issueDate",
          period: { preset: "12m" },
          filters: [{ field: "status", operator: "not_in", value: ["draft", "cancelled"] }],
          chart: "bar",
        },
      };
    return {
      kind: "text",
      text: `Sur les 12 derniers mois, le chiffre d'affaires facturé est de **${String(result.total)}**.\n\n[Voir les factures](${String(result.listUrl)})`,
    };
  }

  if (asked.includes("relance")) {
    if (step === 0)
      return {
        kind: "tool",
        name: "search_records",
        input: {
          entity: "invoice",
          filters: [{ field: "status", operator: "in", value: ["overdue"] }],
          limit: 50,
        },
      };
    if (step === 1) {
      const rows = (result.rows as { id: string }[] | undefined) ?? [];
      if (rows.length === 0)
        return { kind: "text", text: "Aucune facture en retard : rien à relancer." };
      return {
        kind: "tool",
        name: "propose_invoice_reminders",
        input: { invoiceIds: rows.map((r) => r.id).slice(0, 3) },
      };
    }
    return {
      kind: "text",
      text: result.error
        ? `Je n'ai pas pu préparer les relances : ${String(result.error)}`
        : "Les relances sont prêtes : **confirmez** pour les envoyer.",
    };
  }

  if (asked.includes("devis pour")) {
    const name = asked.split("devis pour")[1]!.trim().split(/\s+/)[0]!;
    if (step === 0)
      return {
        kind: "tool",
        name: "search_records",
        input: { entity: "company", search: name, limit: 5 },
      };
    if (step === 1) {
      const company = (result.rows as { id: string }[] | undefined)?.[0];
      if (!company) return { kind: "text", text: `Je ne trouve aucun client « ${name} ».` };
      return {
        kind: "tool",
        name: "propose_create_quote",
        input: {
          companyId: company.id,
          subject: "Accompagnement",
          lines: [{ description: "Journée de conseil", quantity: 2, unitPrice: 650 }],
        },
      };
    }
    return { kind: "text", text: "Le devis est prêt : confirmez pour le créer." };
  }

  if (asked.includes("résume")) {
    const match = /fiche (\w+) d'identifiant (\w+)/.exec(question);
    if (!match) return { kind: "text", text: "Ouvrez une fiche pour que je la résume." };
    if (step === 0)
      return { kind: "tool", name: "get_record", input: { entity: match[1], id: match[2] } };
    return { kind: "text", text: `Résumé de la fiche **${String(result.title)}**.` };
  }

  return { kind: "text", text: "Bonjour ! Je suis l'assistant de test de Quercy." };
}

const EXTRACTION = {
  documentType: "invoice",
  supplierName: "Papeterie Martin",
  supplierSiret: "12345678900012",
  supplierVatNumber: "FR12123456789",
  documentNumber: "F-2026-0142",
  issueDate: "2026-09-12",
  dueDate: "2026-10-12",
  currency: "EUR",
  totalExcludingTax: 100,
  totalTax: 20,
  totalIncludingTax: 120,
  vatLines: [{ rate: 20, base: 100, amount: 20 }],
  lines: [{ description: "Ramettes de papier", quantity: 20, unitPrice: 5, total: 100 }],
  paymentMethod: "Virement",
  iban: null,
  notes: null,
};

let seq = 0;
const id = (prefix: string) => `${prefix}_fake${(++seq).toString().padStart(6, "0")}`;
const usage = {
  input_tokens: 120,
  output_tokens: 40,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
};

function contentOf(reply: Exclude<Reply, { kind: "error" }>) {
  if (reply.kind === "refusal") return { content: [], stop_reason: "refusal" };
  if (reply.kind === "text")
    return { content: [{ type: "text", text: reply.text }], stop_reason: "end_turn" };
  return {
    content: [
      ...(reply.text ? [{ type: "text", text: reply.text }] : []),
      { type: "tool_use", id: id("toolu"), name: reply.name, input: reply.input },
    ],
    stop_reason: "tool_use",
  };
}

function writeStream(res: ServerResponse, model: string, reply: Exclude<Reply, { kind: "error" }>) {
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
  const send = (event: string, data: unknown) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const { content, stop_reason } = contentOf(reply);
  send("message_start", {
    type: "message_start",
    message: {
      id: id("msg"),
      type: "message",
      role: "assistant",
      model,
      content: [],
      stop_reason: null,
      stop_sequence: null,
      usage,
    },
  });
  content.forEach((block, index) => {
    if (block.type === "text") {
      send("content_block_start", {
        type: "content_block_start",
        index,
        content_block: { type: "text", text: "" },
      });
      // Découpe en plusieurs morceaux, comme un vrai flux.
      for (const piece of (block.text ?? "").match(/.{1,12}/gs) ?? [])
        send("content_block_delta", {
          type: "content_block_delta",
          index,
          delta: { type: "text_delta", text: piece },
        });
    } else {
      send("content_block_start", {
        type: "content_block_start",
        index,
        content_block: { type: "tool_use", id: block.id, name: block.name, input: {} },
      });
      send("content_block_delta", {
        type: "content_block_delta",
        index,
        delta: { type: "input_json_delta", partial_json: JSON.stringify(block.input) },
      });
    }
    send("content_block_stop", { type: "content_block_stop", index });
  });
  send("message_delta", {
    type: "message_delta",
    delta: { stop_reason, stop_sequence: null },
    usage: { output_tokens: 40 },
  });
  send("message_stop", { type: "message_stop" });
  res.end();
}

async function readBody(req: IncomingMessage): Promise<Body> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Body;
}

export function startFakeAnthropic(
  port = 0,
): Promise<{ server: Server; url: string; requests: RecordedRequest[] }> {
  const requests: RecordedRequest[] = [];
  const server = createServer((req, res) => {
    if (req.method !== "POST" || !req.url?.startsWith("/v1/messages")) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ type: "error", error: { type: "not_found_error", message: "Not found" } }),
      );
      return;
    }
    readBody(req)
      .then((body) => {
        requests.push({ headers: req.headers, body });
        if (body.output_config?.format) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              id: id("msg"),
              type: "message",
              role: "assistant",
              model: body.model,
              content: [{ type: "text", text: JSON.stringify(EXTRACTION) }],
              stop_reason: "end_turn",
              stop_sequence: null,
              usage,
            }),
          );
          return;
        }
        const reply = scriptedReply(body.messages);
        if (reply.kind === "error") {
          res.writeHead(reply.status, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              type: "error",
              error: { type: "api_error", message: "Internal server error" },
            }),
          );
          return;
        }
        if (body.stream) return writeStream(res, body.model, reply);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            id: id("msg"),
            type: "message",
            role: "assistant",
            model: body.model,
            ...contentOf(reply),
            stop_sequence: null,
            usage,
          }),
        );
      })
      .catch(() => {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            type: "error",
            error: { type: "invalid_request_error", message: "Bad JSON" },
          }),
        );
      });
  });
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      const actual = typeof address === "object" && address ? address.port : port;
      resolve({ server, url: `http://127.0.0.1:${actual}`, requests });
    });
  });
}

if (process.argv[1]?.endsWith("fake-anthropic.ts")) {
  const port = Number(process.argv[2] ?? 4010);
  void startFakeAnthropic(port).then(({ url }) => console.info(`Faux service Claude sur ${url}`));
}
