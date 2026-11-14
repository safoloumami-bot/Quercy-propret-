"use client";

import {
  ACTIONS,
  ACTION_LABELS,
  type Action,
  MODULES,
  MODULE_KEYS,
  type ModuleKey,
  PLATFORM_RESOURCES,
  PLATFORM_RESOURCE_LABELS,
  type PermissionMatrix,
  type Resource,
  SCOPE_LABELS,
  type Scope,
  applicableScopes,
} from "@quercy/core";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@quercy/ui/components/select";
import { cn } from "@quercy/ui/lib/utils";

const NONE = "none";

function resourceLabel(resource: Resource): string {
  return (MODULE_KEYS as readonly string[]).includes(resource)
    ? MODULES[resource as ModuleKey].name
    : PLATFORM_RESOURCE_LABELS[resource as (typeof PLATFORM_RESOURCES)[number]];
}

/** Éditeur de la matrice ressource × action → portée. */
export function PermissionMatrixEditor({
  value,
  onChange,
  readOnly,
  activeModules,
}: {
  value: PermissionMatrix;
  onChange: (next: PermissionMatrix) => void;
  readOnly: boolean;
  activeModules: readonly ModuleKey[];
}) {
  const groups: { label: string; resources: Resource[] }[] = [
    { label: "Modules actifs", resources: MODULE_KEYS.filter((m) => activeModules.includes(m)) },
    { label: "Modules inactifs", resources: MODULE_KEYS.filter((m) => !activeModules.includes(m)) },
    { label: "Plateforme", resources: [...PLATFORM_RESOURCES] },
  ].filter((g) => g.resources.length > 0);

  function set(resource: Resource, action: Action, scope: Scope | null) {
    const grant = { ...value[resource] };
    if (scope) grant[action] = scope;
    else delete grant[action];
    onChange({ ...value, [resource]: grant });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="h-9 px-3 text-left text-xs font-medium text-muted-foreground">
              Ressource
            </th>
            {ACTIONS.map((a) => (
              <th
                key={a}
                className="h-9 px-1.5 text-left text-xs font-medium text-muted-foreground"
              >
                {ACTION_LABELS[a]}
              </th>
            ))}
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.label} className="divide-y divide-border border-t border-border">
            <tr>
              <th
                colSpan={ACTIONS.length + 1}
                className="bg-muted/30 px-3 py-1.5 text-left text-xs font-medium text-muted-foreground"
              >
                {group.label}
              </th>
            </tr>
            {group.resources.map((resource) => (
              <tr key={resource}>
                <th scope="row" className="px-3 py-1.5 text-left font-medium whitespace-nowrap">
                  {resourceLabel(resource)}
                </th>
                {ACTIONS.map((action) => {
                  const current = value[resource]?.[action] ?? null;
                  const label = `${resourceLabel(resource)} — ${ACTION_LABELS[action]}`;
                  if (readOnly) {
                    return (
                      <td
                        key={action}
                        className={cn(
                          "px-1.5 py-1.5 text-xs",
                          current ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {current ? SCOPE_LABELS[current] : "—"}
                      </td>
                    );
                  }
                  return (
                    <td key={action} className="px-1 py-1">
                      <Select
                        value={current ?? NONE}
                        onValueChange={(v) =>
                          set(resource, action, v === NONE ? null : (v as Scope))
                        }
                      >
                        <SelectTrigger
                          aria-label={label}
                          className={cn(
                            "h-7 min-w-24 text-xs",
                            !current && "text-muted-foreground",
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>—</SelectItem>
                          {applicableScopes(resource, action).map((s) => (
                            <SelectItem key={s} value={s}>
                              {SCOPE_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
