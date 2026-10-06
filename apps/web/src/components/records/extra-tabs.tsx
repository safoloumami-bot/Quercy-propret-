"use client";

import type { EntityKey, ModuleKey } from "@quercy/core";
import type * as React from "react";

import { ClientOverview } from "@/components/cleaning/client-overview";
import { FieldRecord } from "@/components/cleaning/field-record";
import { SiteSheet } from "@/components/cleaning/site-sheet";
import { useAccess } from "@/components/shell/access-context";

interface ExtraTab {
  value: string;
  label: string;
  module: ModuleKey;
  render: (id: string) => React.ReactNode;
}

/** Onglets propres à un métier, ajoutés aux fiches génériques (fiche de site, vue client…). */
const EXTRA_TABS: Partial<Record<EntityKey, ExtraTab[]>> = {
  site: [
    {
      value: "fiche-site",
      label: "Fiche de site",
      module: "cleaning",
      render: (id) => <SiteSheet siteId={id} />,
    },
  ],
  intervention: [
    {
      value: "releve-terrain",
      label: "Relevé terrain",
      module: "cleaning",
      render: (id) => <FieldRecord interventionId={id} />,
    },
  ],
  company: [
    {
      value: "vue-ensemble",
      label: "Vue d'ensemble",
      module: "cleaning",
      render: (id) => <ClientOverview companyId={id} />,
    },
  ],
};

export function useExtraTabs(entity: EntityKey): ExtraTab[] {
  const { allows } = useAccess();
  return (EXTRA_TABS[entity] ?? []).filter((t) => allows(t.module, "view"));
}
