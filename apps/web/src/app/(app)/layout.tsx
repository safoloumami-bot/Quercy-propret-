import { cookies } from "next/headers";
import type * as React from "react";

import { AccentStyle } from "@/components/accent-style";
import { AppShell } from "@/components/shell/app-shell";
import { SIDEBAR_COOKIE } from "@/components/shell/constants";
import { SetupRequired } from "@/components/setup-required";
import { getWorkspaceContext } from "@/lib/workspace";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const context = await getWorkspaceContext();
  if (!context) return <SetupRequired />;

  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "1";
  const { organization, user, role, workspaces } = context;

  return (
    <>
      <AccentStyle color={organization.preferences.accentColor} />
      <AppShell
        initialCollapsed={collapsed}
        current={{ id: organization.id, name: organization.name, logoUrl: organization.logoUrl }}
        workspaces={workspaces}
        user={user}
        roleName={role.name}
      >
        {children}
      </AppShell>
    </>
  );
}
