"use client";

import {
  ArrowRightIcon,
  CommandIcon,
  KeyboardIcon,
  PaletteIcon,
  SwatchBookIcon,
} from "lucide-react";
import Link from "next/link";
import type * as React from "react";

import { KeyCombo } from "@/components/shell/key-combo";
import { useShell } from "@/components/shell/shell-context";

const rowClass =
  "group flex w-full items-center gap-3 rounded-lg border border-border px-4 py-3 text-left transition-colors outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40";

function Row({
  icon,
  title,
  description,
  trailing,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  trailing: React.ReactNode;
}) {
  return (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary [&_svg]:size-4">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
      {trailing}
    </>
  );
}

export function StartActions() {
  const { setPaletteOpen, setHelpOpen } = useShell();
  const arrow = (
    <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
  );

  return (
    <ul className="grid grid-cols-1 gap-2 2xl:grid-cols-2">
      <li>
        <button type="button" className={rowClass} onClick={() => setPaletteOpen(true)}>
          <Row
            icon={<CommandIcon />}
            title="Tout trouver avec la palette de commandes"
            description="Aller à un écran ou lancer une action, sans la souris."
            trailing={<KeyCombo keys={["mod", "K"]} />}
          />
        </button>
      </li>
      <li>
        <button type="button" className={rowClass} onClick={() => setHelpOpen(true)}>
          <Row
            icon={<KeyboardIcon />}
            title="Apprendre les raccourcis clavier"
            description="Naviguer d'un écran à l'autre en deux touches."
            trailing={<KeyCombo keys={["?"]} />}
          />
        </button>
      </li>
      <li>
        <Link href="/reglages/apparence" className={rowClass}>
          <Row
            icon={<PaletteIcon />}
            title="Mettre l'espace à vos couleurs"
            description="Thème clair ou sombre et couleur d'accent de l'entreprise."
            trailing={arrow}
          />
        </Link>
      </li>
      <li>
        <Link href="/design-system" className={rowClass}>
          <Row
            icon={<SwatchBookIcon />}
            title="Parcourir le design system"
            description="Les composants et les jetons qui construisent l'interface."
            trailing={arrow}
          />
        </Link>
      </li>
    </ul>
  );
}
