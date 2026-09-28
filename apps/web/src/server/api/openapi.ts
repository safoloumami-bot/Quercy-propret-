import { ENTITIES, ENTITY_KEYS, type FieldDef, WEBHOOK_EVENTS } from "@quercy/core";

function fieldSchema(f: FieldDef): Record<string, unknown> {
  const base: Record<string, unknown> = { description: f.label };
  switch (f.type) {
    case "number":
    case "percent":
    case "duration":
      return { ...base, type: "number" };
    case "currency":
      return { ...base, type: "number", description: `${f.label} (en euros)` };
    case "boolean":
      return { ...base, type: "boolean" };
    case "date":
      return { ...base, type: "string", format: "date" };
    case "datetime":
      return { ...base, type: "string", format: "date-time" };
    case "email":
      return { ...base, type: "string", format: "email" };
    case "url":
      return { ...base, type: "string", format: "uri" };
    case "select":
      return { ...base, type: "string", enum: f.options?.map((o) => o.value) };
    case "multiselect":
    case "tags":
      return { ...base, type: "array", items: { type: "string" } };
    case "relation":
      return { ...base, type: "string", description: `${f.label} (identifiant ${f.relation})` };
    case "user":
      return { ...base, type: "string", description: `${f.label} (identifiant de membre)` };
    default:
      return { ...base, type: "string" };
  }
}

const error = { $ref: "#/components/schemas/Error" };

/** Description OpenAPI 3.1 de l'API publique, générée depuis le registre des entités. */
export function openApiDocument(serverUrl: string) {
  const schemas: Record<string, unknown> = {
    Error: {
      type: "object",
      properties: {
        error: {
          type: "object",
          properties: {
            status: { type: "integer" },
            message: { type: "string" },
            fields: { type: "object", additionalProperties: { type: "string" } },
          },
        },
      },
    },
  };
  const paths: Record<string, unknown> = {};
  for (const key of ENTITY_KEYS) {
    const def = ENTITIES[key];
    const editable = def.fields.filter((f) => f.editable);
    schemas[key] = {
      type: "object",
      properties: {
        id: { type: "string" },
        ...Object.fromEntries(def.fields.map((f) => [f.key, fieldSchema(f)])),
      },
    };
    schemas[`${key}Input`] = {
      type: "object",
      required: editable.filter((f) => f.required).map((f) => f.key),
      properties: Object.fromEntries(editable.map((f) => [f.key, fieldSchema(f)])),
    };
    const tag = def.labelPlural;
    const one = { $ref: `#/components/schemas/${key}` };
    const idParam = { name: "id", in: "path", required: true, schema: { type: "string" } };
    const json = (schema: unknown) => ({ content: { "application/json": { schema } } });
    paths[`/${key}`] = {
      get: {
        tags: [tag],
        summary: `Lister : ${def.labelPlural.toLowerCase()}`,
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", maximum: 200, default: 50 } },
          { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "sort", in: "query", schema: { type: "string" }, example: "createdAt:desc" },
          {
            name: "filter",
            in: "query",
            description:
              'Filtre JSON : {"combinator":"and","rules":[{"field":"status","operator":"in","value":["sent"]}]}',
            schema: { type: "string" },
          },
        ],
        responses: {
          200: json({
            type: "object",
            properties: {
              data: { type: "array", items: one },
              total: { type: "integer" },
              nextOffset: { type: ["integer", "null"] },
            },
          }),
          401: json(error),
          403: json(error),
        },
      },
      ...(def.customPage
        ? {}
        : {
            post: {
              tags: [tag],
              summary: `Créer : ${def.label.toLowerCase()}`,
              requestBody: json({ $ref: `#/components/schemas/${key}Input` }),
              responses: {
                201: json({ type: "object", properties: { data: one } }),
                400: json(error),
              },
            },
          }),
    };
    paths[`/${key}/{id}`] = {
      get: {
        tags: [tag],
        summary: `Lire : ${def.label.toLowerCase()}`,
        parameters: [idParam],
        responses: { 200: json({ type: "object", properties: { data: one } }), 404: json(error) },
      },
      patch: {
        tags: [tag],
        summary: `Modifier : ${def.label.toLowerCase()}`,
        parameters: [idParam],
        requestBody: json({ $ref: `#/components/schemas/${key}Input` }),
        responses: { 200: json({ type: "object", properties: { data: one } }), 400: json(error) },
      },
      delete: {
        tags: [tag],
        summary: `Mettre à la corbeille : ${def.label.toLowerCase()}`,
        parameters: [idParam],
        responses: { 204: { description: "Supprimé" }, 404: json(error) },
      },
    };
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "API Quercy",
      version: "1.0.0",
      description:
        "API REST de Quercy. Authentification : en-tête `Authorization: Bearer <clé>` (clé créée dans Intégrations). La clé agit avec les droits de la personne qui l'a créée ; 600 requêtes par minute. Webhooks : évènements " +
        `${WEBHOOK_EVENTS.slice(0, 3).join(", ")}… signés par l'en-tête X-Quercy-Signature (t=horodatage,v1=HMAC-SHA256 de « horodatage.corps »).`,
    },
    servers: [{ url: `${serverUrl}/api/v1` }],
    security: [{ bearer: [] }],
    components: { securitySchemes: { bearer: { type: "http", scheme: "bearer" } }, schemas },
    paths,
  };
}
