"use client";

import { MODULES, MODULE_KEYS, type ModuleKey } from "@quercy/core";
import { Button } from "@quercy/ui/components/button";
import { Switch } from "@quercy/ui/components/switch";
import { toast } from "@quercy/ui/components/toaster";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as React from "react";

import { errorMessage, useTRPC } from "@/lib/trpc";

import { SettingsSection } from "../section";

export function ModulesSection({ enabled, canEdit }: { enabled: ModuleKey[]; canEdit: boolean }) {
  const trpc = useTRPC();
  const router = useRouter();
  const [selected, setSelected] = React.useState<ModuleKey[]>(enabled);
  const update = useMutation(trpc.workspace.updateModules.mutationOptions());
  const dirty = [...selected].sort().join() !== [...enabled].sort().join();

  function save() {
    update.mutate(
      { modules: selected },
      {
        onSuccess: () => {
          router.refresh();
          toast.success("Modules mis à jour.", {
            action: {
              label: "Annuler",
              onClick: () =>
                update.mutate(
                  { modules: enabled },
                  {
                    onSuccess: () => {
                      setSelected(enabled);
                      router.refresh();
                    },
                  },
                ),
            },
          });
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  }

  return (
    <SettingsSection
      id="modules"
      title="Modules"
      description="Activez seulement ce dont l'entreprise a besoin : les menus et tableaux de bord s'adaptent. Désactiver un module masque ses écrans sans supprimer ses données."
      footer={
        canEdit ? (
          <Button onClick={save} disabled={!dirty || selected.length === 0 || update.isPending}>
            {update.isPending ? "Enregistrement…" : "Enregistrer les modules"}
          </Button>
        ) : null
      }
    >
      <ul className="grid grid-cols-2 gap-x-6 gap-y-1">
        {MODULE_KEYS.map((key) => {
          const m = MODULES[key];
          const on = selected.includes(key);
          return (
            <li key={key} className="flex items-center justify-between gap-4 py-2">
              <label htmlFor={`module-${key}`} className="min-w-0">
                <span className="block text-sm font-medium">{m.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {m.description}
                </span>
              </label>
              <Switch
                id={`module-${key}`}
                checked={on}
                disabled={!canEdit}
                onCheckedChange={(v) =>
                  setSelected(v ? [...selected, key] : selected.filter((k) => k !== key))
                }
              />
            </li>
          );
        })}
      </ul>
    </SettingsSection>
  );
}
