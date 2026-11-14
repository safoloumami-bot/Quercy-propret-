"use client";

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { FieldDef, SortSpec, ViewConfig } from "@quercy/core";
import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import { Checkbox } from "@quercy/ui/components/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@quercy/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@quercy/ui/components/select";
import { cn } from "@quercy/ui/lib/utils";
import {
  ArrowUpDownIcon,
  Columns3Icon,
  GripVerticalIcon,
  GroupIcon,
  PinIcon,
  PlusIcon,
  Rows3Icon,
  XIcon,
} from "lucide-react";

type Column = ViewConfig["columns"][number];

function SortableColumn({
  column,
  field,
  onChange,
}: {
  column: Column;
  field: FieldDef;
  onChange: (c: Column) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.key,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex h-8 items-center gap-2 rounded-md px-1 text-sm",
        isDragging && "bg-accent shadow-sm",
      )}
    >
      <button
        type="button"
        className="cursor-grab rounded-sm p-0.5 text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label={`Déplacer la colonne ${field.label}`}
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <Checkbox
        checked={column.visible}
        onCheckedChange={(v) => onChange({ ...column, visible: v === true })}
        aria-label={`Afficher ${field.label}`}
      />
      <span className="flex-1 truncate">{field.label}</span>
      {field.custom ? <Badge variant="outline">Perso.</Badge> : null}
      <button
        type="button"
        onClick={() => onChange({ ...column, pinned: !column.pinned })}
        className={cn(
          "rounded-sm p-1 hover:bg-accent",
          column.pinned ? "text-primary" : "text-muted-foreground",
        )}
        aria-pressed={Boolean(column.pinned)}
        aria-label={column.pinned ? `Libérer ${field.label}` : `Figer ${field.label} à gauche`}
      >
        <PinIcon className="size-3.5" />
      </button>
    </li>
  );
}

export function ColumnsMenu({
  fields,
  columns,
  onChange,
}: {
  fields: FieldDef[];
  columns: Column[];
  onChange: (columns: Column[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const byKey = new Map(fields.map((f) => [f.key, f]));
  const visible = columns.filter((c) => c.visible).length;
  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = columns.findIndex((c) => c.key === active.id);
    const to = columns.findIndex((c) => c.key === over.id);
    onChange(arrayMove(columns, from, to));
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <Columns3Icon />
          Colonnes
          <span className="text-xs text-muted-foreground tabular-nums">{visible}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="end">
        <p className="px-1 pb-1.5 text-xs text-muted-foreground">
          Glissez pour réordonner, épinglez pour figer à gauche.
        </p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={columns.map((c) => c.key)} strategy={verticalListSortingStrategy}>
            <ul className="max-h-80 overflow-y-auto">
              {columns.map((column) => {
                const field = byKey.get(column.key);
                return field ? (
                  <SortableColumn
                    key={column.key}
                    column={column}
                    field={field}
                    onChange={(next) =>
                      onChange(columns.map((c) => (c.key === next.key ? next : c)))
                    }
                  />
                ) : null;
              })}
            </ul>
          </SortableContext>
        </DndContext>
      </PopoverContent>
    </Popover>
  );
}

export function SortMenu({
  fields,
  sort,
  onChange,
}: {
  fields: FieldDef[];
  sort: SortSpec[];
  onChange: (sort: SortSpec[]) => void;
}) {
  const sortable = fields.filter((f) => f.sortable);
  const unused = sortable.filter((f) => !sort.some((s) => s.field === f.key));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant={sort.length > 0 ? "subtle" : "ghost"} size="sm">
          <ArrowUpDownIcon />
          Trier
          {sort.length > 0 ? <Badge variant="primary">{sort.length}</Badge> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 space-y-2" align="start">
        {sort.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Tri par défaut. Astuce : Maj + clic sur un en-tête ajoute un tri secondaire.
          </p>
        ) : (
          sort.map((s, index) => (
            <div key={s.field} className="flex items-center gap-1.5">
              <span className="w-12 text-xs text-muted-foreground">
                {index === 0 ? "Trier par" : "puis"}
              </span>
              <Select
                value={s.field}
                onValueChange={(field) =>
                  onChange(sort.map((x, i) => (i === index ? { ...x, field } : x)))
                }
              >
                <SelectTrigger className="h-7 flex-1" aria-label="Champ de tri">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortable
                    .filter((f) => f.key === s.field || !sort.some((x) => x.field === f.key))
                    .map((f) => (
                      <SelectItem key={f.key} value={f.key}>
                        {f.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Select
                value={s.direction}
                onValueChange={(direction) =>
                  onChange(
                    sort.map((x, i) =>
                      i === index ? { ...x, direction: direction as "asc" | "desc" } : x,
                    ),
                  )
                }
              >
                <SelectTrigger className="h-7 w-32" aria-label="Sens du tri">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Croissant</SelectItem>
                  <SelectItem value="desc">Décroissant</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onChange(sort.filter((_, i) => i !== index))}
                aria-label="Retirer ce tri"
              >
                <XIcon />
              </Button>
            </div>
          ))
        )}
        {unused.length > 0 && sort.length < 5 ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onChange([...sort, { field: unused[0]!.key, direction: "asc" }])}
          >
            <PlusIcon />
            Ajouter un tri
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

const NO_GROUP = "__none__";

export function GroupMenu({
  fields,
  groupBy,
  onChange,
}: {
  fields: FieldDef[];
  groupBy: string | null;
  onChange: (g: string | null) => void;
}) {
  const groupable = fields.filter((f) => f.groupable && !f.custom);
  return (
    <Select value={groupBy ?? NO_GROUP} onValueChange={(v) => onChange(v === NO_GROUP ? null : v)}>
      <SelectTrigger
        className={cn("h-7 w-auto gap-1.5 border-none shadow-none", groupBy && "bg-secondary")}
        aria-label="Regrouper par"
      >
        <GroupIcon className="size-4 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_GROUP}>Sans regroupement</SelectItem>
        {groupable.map((f) => (
          <SelectItem key={f.key} value={f.key}>
            Regrouper par {f.label.toLowerCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const DENSITY_LABELS = { compact: "Compacte", normal: "Normale", comfortable: "Aérée" } as const;

export function DensityMenu({
  density,
  onChange,
}: {
  density: ViewConfig["density"];
  onChange: (d: ViewConfig["density"]) => void;
}) {
  return (
    <Select value={density} onValueChange={(v) => onChange(v as ViewConfig["density"])}>
      <SelectTrigger className="h-7 w-auto gap-1.5 border-none shadow-none" aria-label="Densité">
        <Rows3Icon className="size-4 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(DENSITY_LABELS) as ViewConfig["density"][]).map((d) => (
          <SelectItem key={d} value={d}>
            Densité {DENSITY_LABELS[d].toLowerCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
