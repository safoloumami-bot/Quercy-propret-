import { Prisma } from "@prisma/client";

import { prisma } from "./client";

/** Modèles métier portant un `organizationId` : filtrés automatiquement par espace. */
export const TENANT_MODELS = [
  "Role",
  "Membership",
  "Team",
  "Invitation",
  "AuditLog",
  "CustomFieldDefinition",
  "SavedView",
  "Company",
  "Contact",
  "Comment",
  "StoredFile",
  "Notification",
  "Deal",
  "Activity",
  "Product",
  "SalesDocument",
  "Payment",
  "SalesSettings",
  "NumberSequence",
  "Project",
  "Task",
  "TimeEntry",
  "Supplier",
  "PurchaseOrder",
  "Bill",
  "Expense",
  "Warehouse",
  "StockMovement",
  "Event",
  "Ticket",
  "Employee",
  "Leave",
  "BankAccount",
  "BankTransaction",
  "Document",
  "Site",
  "CleaningContract",
  "Intervention",
  "Inspection",
  "FieldAccess",
  "ServiceLine",
  "RecurrenceSeries",
  "RecurrenceRuleVersion",
  "SiteClosure",
  "InterventionEvent",
  "InterventionProof",
  "Anomaly",
  "SiteInfo",
  "InterventionTask",
  "InterventionConsumable",
  "MissionSheet",
  "MissionTask",
  "MissionSheetVersion",
  "WorkerProfile",
  "WorkerDocument",
  "Absence",
  "Route",
  "RouteStop",
  "Equipment",
  "EquipmentMovement",
  "Vehicle",
  "AssetReport",
  "Rental",
  "Estimate",
  "QuoteRequest",
  "ClientReview",
  "PushSubscription",
  "TerrainToken",
  "TerrainAlert",
  "TerrainSettings",
  "SupplierPrice",
  "PurchaseOrderLine",
  "MissionConsumable",
  "DuplicateDismissal",
  "Dashboard",
  "Report",
  "AiConversation",
  "AiAction",
  "AiUsage",
] as const;

/** Modèles à suppression douce : les éléments en corbeille sont masqués par défaut. */
export const SOFT_DELETE_MODELS = [
  "Role",
  "Membership",
  "Team",
  "CustomFieldDefinition",
  "SavedView",
  "Company",
  "Contact",
  "Comment",
  "StoredFile",
  "Deal",
  "Activity",
  "Product",
  "SalesDocument",
  "Project",
  "Task",
  "TimeEntry",
  "Supplier",
  "PurchaseOrder",
  "Bill",
  "Expense",
  "Warehouse",
  "StockMovement",
  "Event",
  "Ticket",
  "Employee",
  "Leave",
  "BankAccount",
  "BankTransaction",
  "Document",
  "Site",
  "CleaningContract",
  "Intervention",
  "Inspection",
  "Report",
  "Equipment",
  "Vehicle",
  "Rental",
  "Estimate",
] as const;

const tenantModels = new Set<string>(TENANT_MODELS);
const softDeleteModels = new Set<string>(SOFT_DELETE_MODELS);

const READ_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);
const WHERE_WRITE_OPERATIONS = new Set(["update", "updateMany", "delete", "deleteMany"]);

type Args = Record<string, unknown> & {
  where?: Record<string, unknown>;
  data?: unknown;
  create?: Record<string, unknown>;
};

function withTenant(data: unknown, organizationId: string): Record<string, unknown> {
  const { organization: _ignored, ...rest } = (data ?? {}) as Record<string, unknown>;
  return { ...rest, organizationId };
}

/**
 * Rôle PostgreSQL sans passe-droit sous lequel s'exécutent les requêtes d'un espace : la RLS
 * de la base n'y laisse voir et écrire que les lignes de l'espace (migration core_lot1).
 * TENANT_DB_ROLE vide = seulement app.org_id (dépannage d'une base sans ce rôle).
 */
function tenantRole(): string {
  return process.env.TENANT_DB_ROLE ?? "quercy_tenant";
}

/**
 * Client Prisma restreint à un espace. Chaque requête sur un modèle métier reçoit
 * `organizationId` : en filtre pour les lectures, mises à jour et suppressions, et en valeur
 * forcée pour les créations. Un identifiant appartenant à un autre espace est donc
 * introuvable, quel que soit le code appelant.
 *
 * Les lectures masquent les éléments supprimés (`deletedAt`), sauf si la requête filtre
 * explicitement sur `deletedAt` (corbeille).
 *
 * Défense en profondeur : chaque requête passe aussi par la base sous le rôle restreint, avec
 * `app.org_id` = l'espace. Même si un filtre manquait dans le code, PostgreSQL refuserait de
 * montrer ou d'écrire une ligne d'une autre entreprise.
 */
export function forTenant(organizationId: string) {
  if (!organizationId) throw new Error("forTenant : organizationId manquant.");

  return prisma.$extends({
    name: "tenant-isolation",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!tenantModels.has(model)) return query(args);
          const a = { ...(args as Args) };

          if (READ_OPERATIONS.has(operation) || WHERE_WRITE_OPERATIONS.has(operation)) {
            const where: Record<string, unknown> = { ...a.where, organizationId };
            if (
              READ_OPERATIONS.has(operation) &&
              softDeleteModels.has(model) &&
              !(a.where && "deletedAt" in a.where)
            ) {
              where.deletedAt = null;
            }
            a.where = where;
          } else if (operation === "create") {
            a.data = withTenant(a.data, organizationId);
          } else if (operation === "createMany" || operation === "createManyAndReturn") {
            const rows = Array.isArray(a.data) ? a.data : [a.data];
            a.data = rows.map((row) => withTenant(row, organizationId));
          } else if (operation === "upsert") {
            a.where = { ...a.where, organizationId };
            a.create = withTenant(a.create, organizationId);
          }
          const role = tenantRole();
          const [, result] = await prisma.$transaction([
            role
              ? prisma.$executeRaw`SELECT set_config('app.org_id', ${organizationId}, TRUE), set_config('role', ${role}, TRUE)`
              : prisma.$executeRaw`SELECT set_config('app.org_id', ${organizationId}, TRUE)`,
            query(a as typeof args),
          ]);
          return result;
        },
      },
    },
  });
}

export type TenantClient = ReturnType<typeof forTenant>;

/** Vrai si l'erreur Prisma signale un enregistrement introuvable (P2025). */
export function isNotFoundError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

/** Vrai si l'erreur Prisma signale une contrainte d'unicité violée (P2002). */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
