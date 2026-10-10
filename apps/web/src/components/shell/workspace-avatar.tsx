import { cn } from "@quercy/ui/lib/utils";

import type { WorkspaceSummary } from "@/lib/workspace";

/** Logo de l'espace, ou ses initiales sur la couleur d'accent. */
export function WorkspaceAvatar({
  workspace,
  className,
}: {
  workspace: WorkspaceSummary;
  className?: string;
}) {
  if (workspace.logoUrl) {
    return (
      // Les logos d'entreprise peuvent être hébergés n'importe où : <img> plutôt que next/image.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={workspace.logoUrl}
        alt=""
        className={cn("size-6 shrink-0 rounded-md object-cover", className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-semibold text-primary-foreground",
        className,
      )}
    >
      {workspace.name.slice(0, 1).toUpperCase()}
    </span>
  );
}
