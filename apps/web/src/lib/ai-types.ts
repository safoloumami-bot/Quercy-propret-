import type {
  ChartType,
  DocumentExtraction,
  EntityKey,
  FieldDef,
  ReportDefinition,
} from "@quercy/core";

/** Élément affiché dans un tour de l'assistant. */
export type AiPart =
  | { type: "text"; text: string }
  | { type: "tool"; name: string; label: string }
  | {
      type: "table";
      entity: EntityKey;
      title: string;
      columns: string[];
      rows: { id: string; href: string; cells: string[] }[];
      total: number;
      href: string;
    }
  | {
      type: "chart";
      title: string;
      chart: ChartType;
      definition: ReportDefinition;
      measureField: FieldDef | null;
      total: number;
      points: {
        key: string | null;
        label: string;
        value: number;
        count: number;
        href: string | null;
      }[];
      href: string;
    }
  | { type: "action"; actionId: string; summary: string }
  | {
      type: "extraction";
      fileName: string;
      data: DocumentExtraction;
      /** HT + TVA = TTC ? null si un total manque. */
      consistent: boolean | null;
    }
  | { type: "notice"; tone: "info" | "warning" | "danger"; text: string };

export interface AiTurn {
  role: "user" | "assistant";
  parts: AiPart[];
  at: string;
}

/** Événements envoyés au panneau pendant une réponse (SSE). */
export type AiStreamEvent =
  | { type: "conversation"; id: string; title: string }
  | { type: "text"; delta: string }
  | { type: "part"; part: AiPart }
  | { type: "error"; message: string }
  | { type: "done"; creditsUsed: number; creditsLeft: number };
