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

export function PaymentFailedEmail({
  url,
  organizationName,
  graceDays,
}: {
  url: string;
  organizationName: string;
  graceDays: number;
}) {
  return (
    <EmailLayout
      preview={`Le paiement de l'abonnement ${organizationName} a échoué`}
      title="Votre paiement n'est pas passé"
      action={{ label: "Mettre à jour le moyen de paiement", href: url }}
      footer="Stripe retentera automatiquement le prélèvement. Vous recevez cet email en tant que propriétaire de l'espace."
    >
      <Text>
        Le dernier paiement de l&apos;abonnement de <strong>{organizationName}</strong> a été
        refusé. Votre équipe garde un accès complet pendant {graceDays} jours ; au-delà,
        l&apos;espace passera en lecture seule jusqu&apos;à régularisation.
      </Text>
    </EmailLayout>
  );
}
