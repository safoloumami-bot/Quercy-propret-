"use client";

import type { EntityKey, ModuleKey } from "@quercy/core";
import type * as React from "react";

import { ClientOverview } from "@/components/cleaning/client-overview";
import { FieldRecord } from "@/components/cleaning/field-record";
import { SiteSheet } from "@/components/cleaning/site-sheet";
import {
  EquipmentTab,
  ProductStockTab,
  PurchaseLinesTab,
  RentalTab,
  SupplierPricesTab,
  VehicleTab,
} from "@/components/equipment/asset-tabs";
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
  equipment: [
    {
      value: "suivi",
      label: "Suivi",
      module: "cleaning",
      render: (id) => <EquipmentTab equipmentId={id} />,
    },
  ],
  vehicle: [
    {
      value: "suivi",
      label: "Échéances et états",
      module: "cleaning",
      render: (id) => <VehicleTab vehicleId={id} />,
    },
  ],
  rental: [
    {
      value: "location",
      label: "Sortie, retour, facture",
      module: "cleaning",
      render: (id) => <RentalTab rentalId={id} />,
    },
  ],
  product: [
    {
      value: "stock",
      label: "Stock par emplacement",
      module: "sales",
      render: (id) => <ProductStockTab productId={id} />,
    },
  ],
  purchaseOrder: [
    {
      value: "lignes",
      label: "Lignes et réception",
      module: "purchases",
      render: (id) => <PurchaseLinesTab purchaseOrderId={id} />,
    },
  ],
  supplier: [
    {
      value: "tarifs",
      label: "Tarifs",
      module: "purchases",
      render: (id) => <SupplierPricesTab supplierId={id} />,
    },
  ],
};

export function useExtraTabs(entity: EntityKey): ExtraTab[] {
  const { allows } = useAccess();
  return (EXTRA_TABS[entity] ?? []).filter((t) => allows(t.module, "view"));
}
