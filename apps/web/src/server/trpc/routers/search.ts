import {
  ENTITIES,
  ENTITY_KEYS,
  type EntityKey,
  can,
  recordPath,
  recordSubtitle,
  recordTitle,
} from "@quercy/core";
import { z } from "zod";

import { delegate, entityContext } from "../../records/context";
import { searchWhere } from "../../records/search";
import { createTRPCRouter, orgProcedure } from "../init";

export const searchRouter = createTRPCRouter({
  /** Recherche globale (palette Ctrl+K) : quelques résultats par type, dans le périmètre de chacun. */
  global: orgProcedure
    .input(z.object({ q: z.string().trim().min(2).max(120) }))
    .query(async ({ ctx, input }) => {
      const results: {
        entity: EntityKey;
        id: string;
        title: string;
        subtitle: string | null;
        url: string;
      }[] = [];
      for (const entity of ENTITY_KEYS) {
        const def = ENTITIES[entity];
        if (!ctx.workspace.organization.modules.includes(def.module)) continue;
        if (!can(ctx.workspace.role.permissions, def.module, "view")) continue;
        const { scopeWhere } = await entityContext(ctx, entity, "view");
        const rows = (await delegate(ctx, entity).findMany({
          where: { AND: [scopeWhere, searchWhere(def, input.q)] },
          take: 4,
          orderBy: { updatedAt: "desc" },
        })) as unknown as Record<string, unknown>[];
        for (const r of rows) {
          results.push({
            entity,
            id: String(r.id),
            title: recordTitle(entity, r),
            subtitle: recordSubtitle(entity, r),
            url: recordPath(entity, String(r.id)),
          });
        }
      }
      return results;
    }),
});
