import { can } from "@quercy/core";
import { cookies } from "next/headers";
import type * as React from "react";

import { AccentStyle } from "@/components/accent-style";
import { BillingBanner } from "@/components/billing-banner";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { AppShell } from "@/components/shell/app-shell";
import { SIDEBAR_COOKIE } from "@/components/shell/constants";
import { ThemeSync } from "@/components/theme-preference";
import { requireUser, requireWorkspaceContext } from "@/lib/workspace";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [context, session] = await Promise.all([requireWorkspaceContext(), requireUser()]);
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "1";
  const { organization, user, role, workspaces, billing } = context;
  const impersonating = Boolean(
    (session.session as { impersonatedBy?: string | null }).impersonatedBy,
  );
  const platformAdmin =
    (session.user as { role?: string | null }).role === "admin" && !impersonating;

  return (
    <>
      <AccentStyle color={organization.preferences.accentColor} />
      <ThemeSync theme={user.preferences.theme} />
      <AppShell
        initialCollapsed={collapsed}
        current={{ id: organization.id, name: organization.name, logoUrl: organization.logoUrl }}
        workspaces={workspaces}
        user={{ name: user.name, email: user.email, image: user.image }}
        roleName={role.name}
        permissions={role.permissions}
        modules={organization.modules}
        platformAdmin={platformAdmin}
        banner={
          <>
            {impersonating ? <ImpersonationBanner userName={user.name} /> : null}
            <BillingBanner state={billing} canManage={can(role.permissions, "billing", "admin")} />
          </>
        }
      >
        {children}
      </AppShell>
    </>
  );
}
