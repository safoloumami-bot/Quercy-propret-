import { KeyRoundIcon, LogOutIcon, SparklesIcon } from "lucide-react";
import type { Metadata } from "next";

import { AuthShell, HelpPanel } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/password-forms";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  return (
    <AuthShell
      aside={
        <HelpPanel
          kicker="Bon à savoir"
          title="Un mot de passe solide,"
          accent="facile à retenir."
          items={[
            {
              icon: SparklesIcon,
              title: "Pensez phrase, pas mot",
              text: "« Mon chat dort 3 fois par jour » est plus sûr et plus simple que « X7#kq ».",
            },
            {
              icon: KeyRoundIcon,
              title: "10 caractères minimum",
              text: "Évitez de réutiliser un mot de passe d'un autre site.",
            },
            {
              icon: LogOutIcon,
              title: "Sessions déconnectées",
              text: "Par sécurité, vos autres appareils devront se reconnecter.",
            },
          ]}
        />
      }
    >
      <ResetPasswordForm token={error ? null : (token ?? null)} />
    </AuthShell>
  );
}
