import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { DeleteAccountSection } from "@/components/settings/security/delete-account";
import { PasswordSection } from "@/components/settings/security/password";
import { SessionsSection } from "@/components/settings/security/sessions";
import { TwoFactorSection } from "@/components/settings/security/two-factor";
import { requireUser } from "@/lib/workspace";
import { api } from "@/server/trpc/server";

export const metadata: Metadata = { title: "Sécurité" };

export default async function SecurityPage() {
  const [me, session] = await Promise.all([(await api()).profile.me(), requireUser()]);
  return (
    <>
      <PageHeader
        title="Sécurité"
        description="Mot de passe, double authentification et appareils connectés."
      />
      <PasswordSection hasPassword={me.hasPassword} />
      <TwoFactorSection enabled={me.twoFactorEnabled} hasPassword={me.hasPassword} />
      <SessionsSection currentSessionId={session.session.id} />
      <DeleteAccountSection email={me.email} hasPassword={me.hasPassword} />
    </>
  );
}
