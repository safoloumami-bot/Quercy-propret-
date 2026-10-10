import { Button } from "@quercy/ui/components/button";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { AcceptInvitation } from "@/components/onboarding/accept-invitation";
import { getSession } from "@/server/auth";
import { api } from "@/server/trpc/server";

export const metadata: Metadata = { title: "Invitation" };

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const caller = await api();
  const invitation = await caller.invitations
    .byToken({ token })
    .catch(() => ({ state: "invalid" as const }));
  const session = await getSession();
  const here = `/invitation/${token}`;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-sidebar p-8">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-8 shadow-sm">
        <Image src="/brand/quercy-mark.png" alt="" width={32} height={32} className="rounded-md" />
        {invitation.state !== "pending" ? (
          <div className="space-y-3">
            <h1 className="text-xl font-semibold tracking-tight">
              {invitation.state === "expired"
                ? "Cette invitation a expiré"
                : invitation.state === "used"
                  ? "Cette invitation a déjà été utilisée"
                  : "Invitation introuvable"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Demandez à la personne qui vous a invité de vous envoyer une nouvelle invitation
              depuis les réglages de son espace.
            </p>
            <Button asChild variant="secondary">
              <Link href="/">Aller à l&apos;accueil</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <h1 className="text-xl font-semibold tracking-tight">
                Rejoindre {invitation.organizationName}
              </h1>
              <p className="text-sm text-muted-foreground">
                {invitation.inviterName} vous invite avec le rôle{" "}
                <strong className="text-foreground">{invitation.roleName}</strong>.
                L&apos;invitation a été envoyée à{" "}
                <strong className="text-foreground">{invitation.email}</strong>.
              </p>
            </div>
            {session ? (
              <AcceptInvitation
                token={token}
                sessionEmail={session.user.email}
                invitedEmail={invitation.email}
              />
            ) : (
              <div className="grid gap-2">
                <Button asChild size="lg">
                  <Link
                    href={`/inscription?next=${encodeURIComponent(here)}&email=${encodeURIComponent(invitation.email)}`}
                  >
                    Créer mon compte
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link
                    href={`/connexion?next=${encodeURIComponent(here)}&email=${encodeURIComponent(invitation.email)}`}
                  >
                    J&apos;ai déjà un compte
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
