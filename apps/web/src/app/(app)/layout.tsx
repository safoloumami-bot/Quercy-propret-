import { cookies } from "next/headers";
import type * as React from "react";

import { AccentStyle } from "@/components/accent-style";
import { AppShell } from "@/components/shell/app-shell";
import { SIDEBAR_COOKIE } from "@/components/shell/constants";
import { ThemeSync } from "@/components/theme-preference";
import { requireWorkspaceContext } from "@/lib/workspace";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const context = await requireWorkspaceContext();
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "1";
  const { organization, user, role, workspaces } = context;

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
      >
        {children}
      </AppShell>
    </>
  );
}
