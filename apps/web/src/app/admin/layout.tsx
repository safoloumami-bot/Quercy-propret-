import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type * as React from "react";

import { AdminNav } from "@/components/admin/admin-nav";
import { requireUser } from "@/lib/workspace";

/** Espace super-admin : réservé à l'équipe sebt (user.role = "admin"), hors session d'assistance. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  const role = (session.user as { role?: string | null }).role;
  const impersonating = Boolean(
    (session.session as { impersonatedBy?: string | null }).impersonatedBy,
  );
  if (role !== "admin" || impersonating) notFound();

  return (
    <div className="min-h-dvh bg-background">
      <header className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2 md:px-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <Image src="/brand/sebt-mark.png" alt="" width={22} height={22} className="rounded-md" />
          <span className="font-semibold tracking-tight">sebt · Administration</span>
          <span className="mx-2 h-4 w-px bg-border max-sm:hidden" aria-hidden />
          <AdminNav />
        </div>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          Retour à mon espace
        </Link>
      </header>
      <main className="mx-auto max-w-[1600px] space-y-8 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
