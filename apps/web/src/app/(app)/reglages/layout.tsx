import type * as React from "react";

import { SettingsNav } from "@/components/settings/settings-nav";
import { requireWorkspaceContext } from "@/lib/workspace";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { role } = await requireWorkspaceContext();
  return (
    <div className="mx-auto flex w-full max-w-[1400px] gap-10 px-8 py-8">
      <SettingsNav permissions={role.permissions} />
      <div className="max-w-4xl min-w-0 flex-1 space-y-8">{children}</div>
    </div>
  );
}
