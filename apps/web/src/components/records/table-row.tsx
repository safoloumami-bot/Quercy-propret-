"use client";

import type { FieldDef } from "@quercy/core";
import { Checkbox } from "@quercy/ui/components/checkbox";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@quercy/ui/components/context-menu";
import { cn } from "@quercy/ui/lib/utils";
import {
  ExternalLinkIcon,
  LinkIcon,
  PanelRightOpenIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import * as React from "react";

import { FieldDisplay } from "./field-display";
import { FieldEditor } from "./field-editor";
import type { Row } from "./types";

export interface ColumnLayout {
  field: FieldDef;
  width: number;
  /** Décalage gauche si la colonne est figée. */
  left: number | null;
}

export const SELECT_COLUMN_WIDTH = 40;

export const ROW_HEIGHTS = { compact: 32, normal: 40, comfortable: 52 } as const;

export interface RowActions {
  onOpen: (row: Row) => void;
  onOpenPage: (row: Row) => void;
  onDelete?: (row: Row) => void;
  onEdit: (row: Row, key: string) => void;
  onCommit: (row: Row, key: string, value: unknown) => void;
  onCancelEdit: () => void;
  onToggleSelect: (row: Row, shift: boolean) => void;
  onCopyLink: (row: Row) => void;
  /** Clic hors de la colonne principale : la ligne devient la ligne active. */
  onFocusRow: (index: number) => void;
}

/** Une ligne du tableau : sélection, cellules, édition en place et menu contextuel. */
export const TableRow = React.memo(function TableRow({
  row,
  columns,
  height,
  selected,
  focused,
  editingKey,
  canEdit,
  actions,
  style,
  index,
}: {
  row: Row;
  columns: ColumnLayout[];
  height: number;
  selected: boolean;
  focused: boolean;
  editingKey: string | null;
  canEdit: boolean;
  actions: RowActions;
  style?: React.CSSProperties;
  index: number;
}) {
  const firstEditable = columns.find((c) => c.field.editable && c.field.type !== "image")?.field
    .key;
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="row"
          aria-rowindex={index + 2}
          aria-selected={selected}
          data-focused={focused || undefined}
          style={{ height, ...style }}
          className={cn(
            "group flex border-b border-border bg-background text-sm transition-colors hover:bg-muted/50",
            selected && "bg-primary/6 hover:bg-primary/10",
            focused && "outline-2 -outline-offset-2 outline-ring/60",
          )}
          onClick={() => actions.onFocusRow(index)}
        >
          <div
            role="gridcell"
            className="sticky left-0 z-10 flex shrink-0 items-center justify-center bg-inherit"
            style={{ width: SELECT_COLUMN_WIDTH }}
            onClick={(e) => {
              e.stopPropagation();
              actions.onToggleSelect(row, e.shiftKey);
            }}
          >
            <Checkbox checked={selected} aria-label={`Sélectionner ${row.title}`} tabIndex={-1} />
          </div>
          {columns.map(({ field, width, left }, columnIndex) => {
            const editing = editingKey === field.key;
            const primary = columnIndex === 0;
            return (
              <div
                key={field.key}
                role="gridcell"
                className={cn(
                  "flex shrink-0 items-center overflow-hidden px-3",
                  left !== null && "sticky z-10 bg-inherit",
                  editing && "overflow-visible",
                )}
                style={{ width, left: left ?? undefined }}
                onDoubleClick={(e) => {
                  if (!canEdit || !field.editable || field.type === "image") return;
                  e.stopPropagation();
                  actions.onEdit(row, field.key);
                }}
                onClick={
                  editing
                    ? (e) => e.stopPropagation()
                    : primary
                      ? (e) => {
                          // La colonne principale ouvre la fiche dans le panneau.
                          e.stopPropagation();
                          actions.onFocusRow(index);
                          actions.onOpen(row);
                        }
                      : undefined
                }
              >
                {editing ? (
                  <div
                    className={cn(
                      "w-full",
                      field.type === "relation" &&
                        "absolute top-0 left-0 z-30 w-72 bg-popover shadow-md",
                    )}
                  >
                    <FieldEditor
                      field={field}
                      value={row[field.key]}
                      onCommit={(value) => actions.onCommit(row, field.key, value)}
                      onCancel={actions.onCancelEdit}
                    />
                  </div>
                ) : primary ? (
                  <span className="min-w-0 cursor-pointer truncate font-medium hover:underline">
                    <FieldDisplay field={field} row={row} />
                  </span>
                ) : (
                  <FieldDisplay field={field} row={row} />
                )}
              </div>
            );
          })}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => actions.onOpen(row)}>
          <PanelRightOpenIcon />
          Ouvrir dans le panneau
          <ContextMenuShortcut>Entrée</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => actions.onOpenPage(row)}>
          <ExternalLinkIcon />
          Ouvrir la fiche
          <ContextMenuShortcut>O</ContextMenuShortcut>
        </ContextMenuItem>
        {canEdit && firstEditable ? (
          <ContextMenuItem onSelect={() => actions.onEdit(row, firstEditable)}>
            <PencilIcon />
            Modifier
            <ContextMenuShortcut>E</ContextMenuShortcut>
          </ContextMenuItem>
        ) : null}
        <ContextMenuItem onSelect={() => actions.onCopyLink(row)}>
          <LinkIcon />
          Copier le lien
        </ContextMenuItem>
        {actions.onDelete ? (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onSelect={() => actions.onDelete?.(row)}>
              <Trash2Icon />
              Mettre à la corbeille
            </ContextMenuItem>
          </>
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  );
});
