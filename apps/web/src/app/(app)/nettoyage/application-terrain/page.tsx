import { grantedScope } from "@quercy/core";
import { prisma } from "@quercy/db";
import { Badge } from "@quercy/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@quercy/ui/components/card";
import type { Metadata } from "next";
import QRCode from "qrcode";

import { Forbidden } from "@/components/forbidden";
import { PageHeader } from "@/components/page-header";
import { requireWorkspaceContext } from "@/lib/workspace";
import { env } from "@/server/env";

export const metadata: Metadata = { title: "Application terrain" };

/** Lien, QR code et comptes de l'application terrain des agents (pointage sur téléphone). */
export default async function FieldAppPage() {
  const { organization, role } = await requireWorkspaceContext();
  if (!organization.modules.includes("cleaning"))
    return <Forbidden what="à ce module, désactivé dans l'espace" />;
  if (!grantedScope(role.permissions, "cleaning", "view")) return <Forbidden what="à ce module" />;

  const url = new URL(`/terrain/${organization.slug}`, env().APP_URL).toString();
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 360 });
  const accesses = await prisma.fieldAccess.findMany({
    where: { organizationId: organization.id },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader
        title="Application terrain"
        description="L'application des agents sur téléphone : tournée du jour, pointage, contrôle qualité pièce par pièce, photos, signature du client et bon d'intervention. Tout arrive ici, dans les interventions."
      />
      <div className="grid gap-6 md:grid-cols-[1fr_auto]">
        <Card>
          <CardHeader>
            <CardTitle>Adresse à donner aux agents</CardTitle>
            <CardDescription>
              À ouvrir sur le téléphone, puis « Sur l&apos;écran d&apos;accueil » (iPhone, avec
              Safari) ou « Installer l&apos;application » (Android, avec Chrome).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <a
              href={url}
              target="_blank"
              rel="noopener"
              className="block text-lg font-medium break-all text-primary underline-offset-4 hover:underline"
            >
              {url}
            </a>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>
                Première fois : ouvrez ce lien en étant connecté ici avec un compte administrateur,
                et choisissez votre code responsable à 6 chiffres (identifiant : patron).
              </li>
              <li>
                Dans l&apos;application, « Espace responsable » : créez un identifiant et un code
                pour chaque agent. Un agent qui porte le même nom qu&apos;un membre de l&apos;espace
                lui est relié ; sinon un compte réservé au terrain est créé.
              </li>
              <li>
                Les interventions du planning apparaissent dans la tournée de l&apos;agent à qui
                elles sont affectées. Les chantiers créés sur le téléphone arrivent ici aussi.
              </li>
              <li>
                À la clôture : intervention réalisée, bon numéroté, photos en pièces jointes,
                contrôle qualité enregistré, et bon envoyé au client si l&apos;e-mail est configuré.
              </li>
            </ol>
          </CardContent>
        </Card>
        <Card className="items-center justify-center p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`QR code vers ${url}`} width={180} height={180} />
          <p className="mt-2 text-center text-xs text-muted-foreground">
            À scanner avec le téléphone
          </p>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Accès terrain</CardTitle>
          <CardDescription>
            Identifiants créés depuis l&apos;application. Pour remplacer un code oublié,
            ressaisissez le même identifiant avec un nouveau code dans l&apos;Espace responsable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accesses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun accès pour l&apos;instant : ouvrez l&apos;application pour la mettre en service.
            </p>
          ) : (
            <ul className="divide-y">
              {accesses.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="flex-1 font-medium">{a.user.name}</span>
                  <code className="text-muted-foreground">{a.code}</code>
                  <Badge variant={a.role === "patron" ? "primary" : "neutral"}>
                    {a.role === "patron" ? "Responsable" : "Agent"}
                  </Badge>
                  {!a.active && <Badge variant="outline">Désactivé</Badge>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
