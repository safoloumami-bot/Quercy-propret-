import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type * as React from "react";

import { requireUser } from "@/lib/workspace";

/** Espace super-admin : réservé à l'équipe Quercy (user.role = "admin"), hors session d'assistance. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  const role = (session.user as { role?: string | null }).role;
  const impersonating = Boolean(
    (session.session as { impersonatedBy?: string | null }).impersonatedBy,
  );
  if (role !== "admin" || impersonating) notFound();

  return (
    <div className="min-h-dvh bg-background">
      <header className="flex h-12 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-2.5">
          <Image
            src="/brand/quercy-mark.png"
            alt=""
            width={22}
            height={22}
            className="rounded-md"
          />
          <span className="font-semibold tracking-tight">Quercy · Administration</span>
        </div>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          Retour à mon espace
        </Link>
      </header>
      <main className="mx-auto max-w-[1600px] space-y-8 px-8 py-8">{children}</main>
    </div>
  );
}
