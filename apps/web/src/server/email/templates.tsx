import { Text } from "@react-email/components";

import { EmailLayout } from "./layout";

export function MagicLinkEmail({ url }: { url: string }) {
  return (
    <EmailLayout
      preview="Votre lien de connexion à Quercy"
      title="Votre lien de connexion"
      action={{ label: "Se connecter", href: url }}
    >
      <Text>
        Cliquez sur le bouton ci-dessous pour vous connecter. Le lien est valable 10 minutes et ne
        sert qu&apos;une fois.
      </Text>
    </EmailLayout>
  );
}

export function ResetPasswordEmail({ url, name }: { url: string; name: string }) {
  return (
    <EmailLayout
      preview="Réinitialisez votre mot de passe Quercy"
      title="Nouveau mot de passe"
      action={{ label: "Choisir un nouveau mot de passe", href: url }}
    >
      <Text>Bonjour {name},</Text>
      <Text>
        Une réinitialisation de mot de passe a été demandée pour votre compte. Le lien est valable
        une heure.
      </Text>
    </EmailLayout>
  );
}

export function VerifyEmail({ url, name }: { url: string; name: string }) {
  return (
    <EmailLayout
      preview="Confirmez votre adresse email"
      title="Confirmez votre adresse email"
      action={{ label: "Confirmer mon adresse", href: url }}
    >
      <Text>Bonjour {name},</Text>
      <Text>
        Confirmez votre adresse pour sécuriser votre compte et recevoir les notifications.
      </Text>
    </EmailLayout>
  );
}

export function InvitationEmail({
  url,
  inviterName,
  organizationName,
  roleName,
}: {
  url: string;
  inviterName: string;
  organizationName: string;
  roleName: string;
}) {
  return (
    <EmailLayout
      preview={`${inviterName} vous invite à rejoindre ${organizationName} sur Quercy`}
      title={`Rejoignez ${organizationName}`}
      action={{ label: "Accepter l'invitation", href: url }}
      footer="L'invitation est valable 7 jours. Si vous ne connaissez pas l'expéditeur, ignorez cet email."
    >
      <Text>
        {inviterName} vous invite à rejoindre l&apos;espace <strong>{organizationName}</strong> sur
        Quercy, avec le rôle <strong>{roleName}</strong>.
      </Text>
    </EmailLayout>
  );
}
