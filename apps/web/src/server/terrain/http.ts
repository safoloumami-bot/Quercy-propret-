import "server-only";

/** Membre connecté à l'application terrain. */
export type Me = {
  id: string;
  nom: string;
  code: string;
  role: "patron" | "agent";
  accessId: string;
};
export type Body = Record<string, unknown>;

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}
export const fail = (message: string, status = 400) => json({ erreur: message }, status);
export const str = (v: unknown, max: number) => String(v ?? "").slice(0, max);
export const txt = (v: unknown, max: number) =>
  String(v ?? "")
    .slice(0, max)
    .trim();
export const isDay = (v: unknown): v is string => /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? ""));
export const isMonth = (v: unknown): v is string => /^\d{4}-\d{2}$/.test(String(v ?? ""));
