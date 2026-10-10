import type { Metadata } from "next";

import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "Accueil" };

function greeting(hour: number): string {
  if (hour < 5 || hour >= 18) return "Bonsoir";
  return "Bonjour";
}

export default async function HomePage() {
  const { user, organization } = await requireWorkspaceContext();
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

  return (
    <div className="mx-auto w-full max-w-[2400px] space-y-6 px-8 py-8">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground first-letter:uppercase">
          {today} · {organization.name}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting(hour)} {firstName}
        </h1>
      </header>
      <DashboardGrid />
    </div>
  );
}
