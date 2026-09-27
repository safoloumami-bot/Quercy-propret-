import { createCallerFactory, createTRPCRouter } from "./init";
import { adminRouter } from "./routers/admin";
import { auditRouter } from "./routers/audit";
import { billingRouter } from "./routers/billing";
import { invitationsRouter } from "./routers/invitations";
import { membersRouter } from "./routers/members";
import { profileRouter } from "./routers/profile";
import { rolesRouter } from "./routers/roles";
import { teamsRouter } from "./routers/teams";
import { workspaceRouter } from "./routers/workspace";

export const appRouter = createTRPCRouter({
  workspace: workspaceRouter,
  members: membersRouter,
  invitations: invitationsRouter,
  roles: rolesRouter,
  teams: teamsRouter,
  audit: auditRouter,
  profile: profileRouter,
  billing: billingRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
