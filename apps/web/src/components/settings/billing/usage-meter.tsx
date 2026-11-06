import { cn } from "@quercy/ui/lib/utils";

/** Barre d'utilisation (membres, modules…) avec seuil d'alerte à 80 %. */
export function UsageMeter({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number | null;
}) {
  const ratio = limit === null ? 0 : Math.min(1, used / Math.max(1, limit));
  const over = limit !== null && used > limit;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span
          className={cn(
            "text-muted-foreground tabular-nums",
            over && "font-medium text-destructive",
          )}
        >
          {used} / {limit === null ? "illimité" : limit}
        </span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={limit ?? used}
        aria-valuenow={used}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            "h-full rounded-full bg-primary transition-[width] duration-300",
            ratio >= 0.8 && "bg-warning",
            over && "bg-destructive",
            limit === null && "w-0",
          )}
          style={
            limit === null ? undefined : { width: `${Math.max(ratio * 100, used > 0 ? 3 : 0)}%` }
          }
        />
      </div>
    </div>
  );
}
