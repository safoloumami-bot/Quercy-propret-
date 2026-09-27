import { Badge } from "@quercy/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@quercy/ui/components/card";
import { MODULES, activeModules } from "@quercy/core";
import { prisma } from "@quercy/db";
import type { Metadata } from "next";

import { StartActions } from "@/components/home/start-actions";
import { PLAN_LABELS } from "@/lib/format";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "Accueil" };

function greeting(hour: number): string {
  if (hour < 5 || hour >= 18) return "Bonsoir";
  return "Bonjour";
}

export default async function HomePage() {
  const { user, organization, role } = await requireWorkspaceContext();
  const memberCount = await prisma.membership.count({
    where: { organizationId: organization.id, deletedAt: null },
  });
  const trialDays = organization.trialEndsAt
    ? Math.max(0, Math.ceil((organization.trialEndsAt.getTime() - Date.now()) / 86_400_000))
    : null;
  const { locale, timezone } = organization.preferences;
  const now = new Date();
  const hour = Number(
    new Intl.DateTimeFormat("fr-FR", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: timezone,
    }).format(now),
  );
  const today = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: timezone,
  }).format(now);
  const firstName = user.name.split(" ")[0] ?? user.name;
  const modules = activeModules(organization.modules);
  const inactiveCount = Object.keys(MODULES).length - modules.length;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8 px-8 py-8">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground first-letter:uppercase">{today}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting(hour)} {firstName}
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Pour bien démarrer</CardTitle>
            <CardDescription>
              Quelques gestes pour prendre l&apos;application en main.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StartActions />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{organization.name}</CardTitle>
            <CardDescription>Votre espace de travail</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="divide-y divide-border rounded-md border border-border text-sm">
              {[
                {
                  label: "Offre",
                  value: `${PLAN_LABELS[organization.plan] ?? organization.plan}${
                    trialDays !== null ? ` — essai, ${trialDays} j restants` : ""
                  }`,
                },
                { label: "Membres", value: String(memberCount) },
                { label: "Votre rôle", value: role.name },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between px-3 py-2">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="font-medium tabular-nums">{row.value}</dd>
                </div>
              ))}
            </dl>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Modules activés ({modules.length}
                {inactiveCount > 0 ? ` sur ${Object.keys(MODULES).length}` : ""})
              </p>
              {modules.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {modules.map((m) => (
                    <li key={m.key}>
                      <Badge variant="primary">{m.name}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun module activé.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
