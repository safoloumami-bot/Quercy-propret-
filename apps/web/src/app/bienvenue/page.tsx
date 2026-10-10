import { prisma } from "@quercy/db";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { requireUser } from "@/lib/workspace";

export const metadata: Metadata = { title: "Créer votre espace" };

export default async function WelcomePage() {
  const session = await requireUser();
  const hasWorkspace =
    (await prisma.membership.count({
      where: { userId: session.user.id, deletedAt: null, organization: { deletedAt: null } },
    })) > 0;

  return (
    <div className="min-h-dvh bg-sidebar">
      <header className="flex h-14 items-center justify-between border-b border-border bg-background px-8">
        <div className="flex items-center gap-2.5">
          <Image
            src="/brand/quercy-mark.png"
            alt=""
            width={24}
            height={24}
            className="rounded-md"
          />
          <span className="font-semibold tracking-tight">Quercy</span>
        </div>
        {hasWorkspace ? (
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Retour à mon espace
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">{session.user.email}</span>
        )}
      </header>
      <main className="mx-auto max-w-3xl px-8 py-12">
        <OnboardingWizard firstName={session.user.name.split(" ")[0] ?? session.user.name} />
      </main>
    </div>
  );
}
