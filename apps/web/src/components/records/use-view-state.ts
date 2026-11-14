"use client";

import {
  EMPTY_FILTER,
  type EntityKey,
  type FieldDef,
  type ViewConfig,
  viewConfigSchema,
} from "@quercy/core";
import * as React from "react";

import { FILTER_PARAM, readFilterParam } from "@/lib/filter-param";

/** Configuration par défaut : colonnes visibles par défaut, dans l'ordre de l'entité. */
export function defaultView(fields: FieldDef[]): ViewConfig {
  return {
    columns: fields.map((f) => ({
      key: f.key,
      visible: Boolean(f.defaultVisible),
      width: f.width,
    })),
    sort: [],
    filter: EMPTY_FILTER,
    groupBy: null,
    density: "normal",
    layout: "table",
  };
}

/** Complète une vue enregistrée avec les champs apparus depuis (nouveaux champs personnalisés). */
export function reconcile(config: ViewConfig, fields: FieldDef[]): ViewConfig {
  const known = new Set(fields.map((f) => f.key));
  const columns = config.columns.filter((c) => known.has(c.key));
  for (const f of fields)
    if (!columns.some((c) => c.key === f.key))
      columns.push({ key: f.key, visible: false, width: f.width });
  return { ...config, columns };
}

function storageKey(entity: EntityKey) {
  return `quercy:view:${entity}`;
}

/**
 * État de la vue d'un tableau. Le dernier état est gardé dans le navigateur (préférence
 * personnelle) ; une vue enregistrée l'enregistre côté serveur et peut être partagée.
 */
export function useViewState(entity: EntityKey, fields: FieldDef[]) {
  const [config, setConfig] = React.useState<ViewConfig>(() => defaultView(fields));
  const [viewId, setViewId] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(entity));
      if (raw) {
        const parsed = JSON.parse(raw) as { config: unknown; viewId: string | null };
        const valid = viewConfigSchema.safeParse(parsed.config);
        if (valid.success) {
          setConfig(reconcile(valid.data, fields));
          setViewId(parsed.viewId);
        }
      }
    } catch {
      // Stockage indisponible : on garde la vue par défaut.
    }
    // Filtre transmis par l'URL (clic sur un chiffre du tableau de bord ou d'un rapport) :
    // appliqué en tableau, puis retiré de l'adresse pour ne pas se réappliquer.
    const url = new URL(window.location.href);
    const fromUrl = readFilterParam(url.searchParams.get(FILTER_PARAM));
    if (fromUrl) {
      setConfig((c) => ({ ...c, filter: fromUrl, groupBy: null, layout: "table" }));
      setViewId(null);
      url.searchParams.delete(FILTER_PARAM);
      window.history.replaceState(window.history.state, "", url.toString());
    }
    setLoaded(true);
    // Les champs ne changent pas pendant la vie de la page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity]);

  React.useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(storageKey(entity), JSON.stringify({ config, viewId }));
    } catch {
      // Ignoré.
    }
  }, [entity, config, viewId, loaded]);

  const update = React.useCallback(
    (patch: Partial<ViewConfig>) => setConfig((c) => ({ ...c, ...patch })),
    [],
  );
  const apply = React.useCallback(
    (next: ViewConfig, id: string | null) => {
      setConfig(reconcile(next, fields));
      setViewId(id);
    },
    [fields],
  );
  const reset = React.useCallback(() => {
    setConfig(defaultView(fields));
    setViewId(null);
  }, [fields]);

  return { config, update, apply, reset, viewId, loaded };
}
