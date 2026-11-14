import { can } from "@quercy/core";
import type { Metadata } from "next";

import { Forbidden } from "@/components/forbidden";
import { BillingManager } from "@/components/settings/billing/billing-manager";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "Facturation" };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ paiement?: string }>;
}) {
  const { role } = await requireWorkspaceContext();
  if (!can(role.permissions, "billing", "view")) return <Forbidden what="à la facturation" />;
  const { paiement } = await searchParams;
  return <BillingManager justPaid={paiement === "confirme"} />;
}
