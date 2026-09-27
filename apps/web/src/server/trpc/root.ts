import { createCallerFactory, createTRPCRouter } from "./init";
import { adminRouter } from "./routers/admin";
import { auditRouter } from "./routers/audit";
import { commentsRouter } from "./routers/comments";
import { crmRouter } from "./routers/crm";
import { customFieldsRouter } from "./routers/custom-fields";
import { filesRouter } from "./routers/files";
import { notificationsRouter } from "./routers/notifications";
import { presenceRouter } from "./routers/presence";
import { recordsRouter } from "./routers/records";
import { searchRouter } from "./routers/search";
import { viewsRouter } from "./routers/views";
import { billingRouter } from "./routers/billing";
import { invitationsRouter } from "./routers/invitations";
import { membersRouter } from "./routers/members";
import { profileRouter } from "./routers/profile";
import { rolesRouter } from "./routers/roles";
import { salesRouter } from "./routers/sales";
import { teamsRouter } from "./routers/teams";
import { timerRouter } from "./routers/timer";
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
  records: recordsRouter,
  customFields: customFieldsRouter,
  views: viewsRouter,
  comments: commentsRouter,
  notifications: notificationsRouter,
  search: searchRouter,
  presence: presenceRouter,
  files: filesRouter,
  sales: salesRouter,
  crm: crmRouter,
  timer: timerRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
