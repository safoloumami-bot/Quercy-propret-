import { z } from "zod";

import { heartbeat } from "../../realtime";
import { createTRPCRouter, orgProcedure } from "../init";

export const presenceRouter = createTRPCRouter({
  /** Signale que l'on consulte une fiche et renvoie les personnes qui la consultent aussi. */
  heartbeat: orgProcedure
    .input(z.object({ key: z.string().min(1).max(120) }))
    .mutation(({ ctx, input }) =>
      heartbeat(ctx.organizationId, input.key, { id: ctx.user.id, name: ctx.user.name }),
    ),
});
