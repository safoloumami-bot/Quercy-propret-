"use client";

import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import { Callout } from "@quercy/ui/components/callout";
import { EmptyState } from "@quercy/ui/components/empty-state";
import { Input } from "@quercy/ui/components/input";
import { Label } from "@quercy/ui/components/label";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { Textarea } from "@quercy/ui/components/textarea";
import { toast } from "@quercy/ui/components/toaster";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CameraIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  EraserIcon,
  KeyRoundIcon,
  LogInIcon,
  LogOutIcon,
  MapPinIcon,
  SmartphoneIcon,
} from "lucide-react";
import * as React from "react";

import { toastError } from "@/components/toast-error";
import { prepareImage } from "@/lib/image-tools";
import { useTRPC } from "@/lib/trpc";

function localDayKey(offset = 0): string {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + offset))
    .toISOString()
    .slice(0, 10);
}

function shift(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const dayTitle = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const clock = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

function minutesLabel(minutes: number | null): string {
  if (minutes == null) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
}

/** Zone de signature au doigt ou à la souris ; renvoie une image PNG (data URL). */
function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const drawing = React.useRef(false);
  const dirty = React.useRef(false);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const c = event.currentTarget;
    return {
      x: ((event.clientX - rect.left) / rect.width) * c.width,
      y: ((event.clientY - rect.top) / rect.height) * c.height,
    };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = event.currentTarget.getContext("2d");
    if (!ctx) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const { x, y } = point(event);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = event.currentTarget.getContext("2d");
    if (!ctx) return;
    const { x, y } = point(event);
    ctx.lineTo(x, y);
    ctx.stroke();
    dirty.current = true;
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    if (dirty.current && canvas.current) onChange(canvas.current.toDataURL("image/png"));
  }

  function clear() {
    const c = canvas.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    dirty.current = false;
    onChange(null);
  }

  return (
    <div className="space-y-1.5">
      <canvas
        ref={canvas}
        width={600}
        height={220}
        aria-label="Zone de signature du client"
        className="h-36 w-full touch-none rounded-md border border-dashed border-border bg-white"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <Button type="button" variant="ghost" size="sm" onClick={clear}>
        <EraserIcon />
        Effacer la signature
      </Button>
    </div>
  );
}

function CheckOutForm({ id, onDone }: { id: string; onDone: () => void }) {
  const trpc = useTRPC();
  const [notes, setNotes] = React.useState("");
  const [signedBy, setSignedBy] = React.useState("");
  const [signature, setSignature] = React.useState<string | null>(null);
  const [photo, setPhoto] = React.useState<string | null>(null);
  const checkOut = useMutation(
    trpc.cleaning.checkOut.mutationOptions({
      onSuccess: () => {
        toast.success("Départ pointé. Bonne route !");
        onDone();
      },
      onError: toastError,
    }),
  );

  return (
    <form
      className="space-y-3 rounded-lg border border-border bg-muted/30 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        checkOut.mutate({
          id,
          notes: notes || undefined,
          signedBy: signedBy || undefined,
          signatureUrl: signature ?? undefined,
          photoUrl: photo ?? undefined,
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor={`notes-${id}`}>Compte rendu (facultatif)</Label>
        <Textarea
          id={`notes-${id}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Travail réalisé, produit manquant, anomalie…"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`photo-${id}`}>Photo (facultatif)</Label>
        <div className="flex items-center gap-3">
          <Button type="button" variant="secondary" asChild>
            <label htmlFor={`photo-${id}`} className="cursor-pointer">
              <CameraIcon />
              {photo ? "Changer la photo" : "Prendre une photo"}
            </label>
          </Button>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt="Photo de l'intervention"
              className="size-12 rounded object-cover"
            />
          ) : null}
        </div>
        <input
          id={`photo-${id}`}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              setPhoto(await prepareImage(file, false));
            } catch (error) {
              toastError(error);
            }
          }}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`signed-${id}`}>Nom du client qui signe</Label>
        <Input id={`signed-${id}`} value={signedBy} onChange={(e) => setSignedBy(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Signature du client</Label>
        <SignaturePad onChange={setSignature} />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={checkOut.isPending}>
        <LogOutIcon />
        Pointer mon départ
      </Button>
    </form>
  );
}

/**
 * « Ma journée » : écran mobile de l'agent. Adresse et accès du site, pointage d'arrivée et de
 * départ, photo, compte rendu et signature du client.
 */
export function MyDay() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [day, setDay] = React.useState(() => localDayKey());
  const [closing, setClosing] = React.useState<string | null>(null);
  const list = useQuery(trpc.cleaning.myDay.queryOptions({ day }));
  const refresh = () => queryClient.invalidateQueries(trpc.cleaning.pathFilter());
  const checkIn = useMutation(
    trpc.cleaning.checkIn.mutationOptions({
      onSuccess: () => {
        void refresh();
        toast.success("Arrivée pointée.");
      },
      onError: toastError,
    }),
  );

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="secondary"
          size="icon"
          aria-label="Jour précédent"
          onClick={() => setDay((d) => shift(d, -1))}
        >
          <ChevronLeftIcon />
        </Button>
        <div className="text-center">
          <p className="text-lg font-semibold capitalize">
            {dayTitle.format(new Date(`${day}T00:00:00.000Z`))}
          </p>
          {day !== localDayKey() ? (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => setDay(localDayKey())}
            >
              Revenir à aujourd&apos;hui
            </button>
          ) : (
            <p className="text-xs text-muted-foreground">Aujourd&apos;hui</p>
          )}
        </div>
        <Button
          variant="secondary"
          size="icon"
          aria-label="Jour suivant"
          onClick={() => setDay((d) => shift(d, 1))}
        >
          <ChevronRightIcon />
        </Button>
      </div>

      {list.isPending ? (
        <Skeleton className="h-64" />
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState
          icon={<SmartphoneIcon />}
          title="Aucune intervention ce jour-là"
          description="Les interventions qui vous sont confiées apparaissent ici, avec l'adresse et les codes d'accès."
        />
      ) : (
        <ul className="space-y-3">
          {list.data!.map((i) => {
            const address = [
              i.site?.address,
              [i.site?.postalCode, i.site?.city].filter(Boolean).join(" "),
            ]
              .filter(Boolean)
              .join(", ");
            return (
              <li
                key={i.id}
                className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{i.site?.name ?? i.title}</p>
                    {i.companyName ? (
                      <p className="text-sm text-muted-foreground">{i.companyName}</p>
                    ) : null}
                  </div>
                  <Badge
                    variant={
                      i.status === "done"
                        ? "success"
                        : i.status === "in_progress"
                          ? "primary"
                          : i.status === "missed"
                            ? "danger"
                            : "info"
                    }
                  >
                    {i.status === "done"
                      ? "Réalisée"
                      : i.status === "in_progress"
                        ? "En cours"
                        : i.status === "missed"
                          ? "Non réalisée"
                          : "Planifiée"}
                  </Badge>
                </div>
                <div className="grid gap-1.5 text-sm">
                  <p className="flex items-center gap-2">
                    <ClockIcon className="size-4 text-muted-foreground" />
                    {i.startTime ?? "Horaire libre"}
                    {i.durationMinutes ? ` · ${minutesLabel(i.durationMinutes)} prévues` : ""}
                  </p>
                  {address ? (
                    <a
                      className="flex items-center gap-2 text-primary hover:underline"
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MapPinIcon className="size-4" />
                      {address}
                    </a>
                  ) : null}
                  {i.site?.accessCode || i.site?.keys ? (
                    <p className="flex items-center gap-2">
                      <KeyRoundIcon className="size-4 text-muted-foreground" />
                      {[i.site.accessCode && `Code : ${i.site.accessCode}`, i.site.keys]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                </div>
                {i.site?.instructions ? (
                  <Callout variant="info" className="text-sm whitespace-pre-line">
                    {i.site.instructions}
                  </Callout>
                ) : null}

                {i.checkOutAt ? (
                  <p className="text-sm text-success-text">
                    Arrivée {clock.format(i.checkInAt!)} · départ {clock.format(i.checkOutAt)} ·{" "}
                    {minutesLabel(i.workedMinutes)} travaillées
                    {i.hasSignature ? ` · signé par ${i.signedBy ?? "le client"}` : ""}
                  </p>
                ) : i.checkInAt ? (
                  closing === i.id ? (
                    <CheckOutForm
                      id={i.id}
                      onDone={() => {
                        setClosing(null);
                        void refresh();
                      }}
                    />
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Arrivée pointée à {clock.format(i.checkInAt)}.
                      </p>
                      <Button size="lg" className="w-full" onClick={() => setClosing(i.id)}>
                        <LogOutIcon />
                        Terminer l&apos;intervention
                      </Button>
                    </div>
                  )
                ) : (
                  <Button
                    size="lg"
                    className="w-full"
                    disabled={checkIn.isPending || day !== localDayKey()}
                    onClick={() => checkIn.mutate({ id: i.id })}
                  >
                    <LogInIcon />
                    Pointer mon arrivée
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
