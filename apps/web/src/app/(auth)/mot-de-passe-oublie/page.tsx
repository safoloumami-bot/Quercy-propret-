import { mailConfigured } from "@quercy/mailer";
import { InboxIcon, LinkIcon, ShieldCheckIcon } from "lucide-react";
import type { Metadata } from "next";

import { AuthShell, HelpPanel } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/password-forms";

export const metadata: Metadata = { title: "Mot de passe oublié" };
export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      aside={
        <HelpPanel
          kicker="Comment ça marche"
          title="Retrouvez votre accès"
          accent="en une minute."
          items={[
            {
              icon: LinkIcon,
              title: "Un lien par email",
              text: "Valable une heure et utilisable une seule fois.",
            },
            {
              icon: InboxIcon,
              title: "Rien reçu ?",
              text: "Regardez dans vos spams ou courriers indésirables, puis réessayez.",
            },
            {
              icon: ShieldCheckIcon,
              title: "Votre compte reste protégé",
              text: "Sans accès à votre boîte mail, personne ne peut changer votre mot de passe.",
            },
          ]}
        />
      }
    >
      <ForgotPasswordForm mailReady={mailConfigured()} />
    </AuthShell>
  );
}
