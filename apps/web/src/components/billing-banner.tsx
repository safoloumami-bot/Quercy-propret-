import { type BillingState, READ_ONLY_MESSAGES } from "@quercy/core";
import { Button } from "@quercy/ui/components/button";
import { cn } from "@quercy/ui/lib/utils";
import { CreditCardIcon, LockIcon, SparklesIcon } from "lucide-react";
import Link from "next/link";

/**
 * Bandeau d'état de l'abonnement, en haut de chaque écran : lecture seule, paiement refusé
 * (délai de grâce) ou fin d'essai proche. Le bouton n'apparaît que pour qui peut agir.
 */
export function BillingBanner({ state, canManage }: { state: BillingState; canManage: boolean }) {
  let tone: "danger" | "warning" | "info";
  let icon;
  let text: string;

  if (state.readOnly) {
    tone = "danger";
    icon = <LockIcon />;
    text = `Espace en lecture seule. ${READ_ONLY_MESSAGES[state.readOnly]}`;
  } else if (state.gracePeriod) {
    tone = "warning";
    icon = <CreditCardIcon />;
    text = `Le dernier paiement a échoué. Mettez à jour le moyen de paiement : l'espace passera en lecture seule dans ${state.gracePeriod.daysLeft} jour${state.gracePeriod.daysLeft > 1 ? "s" : ""}.`;
  } else if (state.trialDaysLeft !== null && state.trialDaysLeft <= 7) {
    tone = "info";
    icon = <SparklesIcon />;
    text =
      state.trialDaysLeft === 0
        ? "Dernier jour de votre essai Business."
        : `Il reste ${state.trialDaysLeft} jour${state.trialDaysLeft > 1 ? "s" : ""} d'essai Business.`;
  } else {
    return null;
  }

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex items-center gap-3 border-b px-6 py-2 text-sm [&>svg]:size-4 [&>svg]:shrink-0",
        tone === "danger" && "border-destructive/30 bg-destructive/10 [&>svg]:text-destructive",
        tone === "warning" && "border-warning/40 bg-warning/12 [&>svg]:text-warning",
        tone === "info" && "border-primary/20 bg-primary/8 [&>svg]:text-primary",
      )}
    >
      {icon}
      <p className="flex-1">{text}</p>
      {canManage ? (
        <Button asChild size="sm" variant={tone === "info" ? "secondary" : "primary"}>
          <Link href="/reglages/facturation">
            {tone === "info" ? "Choisir une offre" : "Régulariser"}
          </Link>
        </Button>
      ) : (
        <span className="text-xs text-muted-foreground">
          Prévenez le propriétaire de l&apos;espace.
        </span>
      )}
    </div>
  );
}
