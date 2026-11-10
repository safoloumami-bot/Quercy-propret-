"use client";

import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Vidéo de présentation, intégrée dans la page (jamais en plein écran) :
 * - lecture en ligne (playsInline) : l'iPhone ne l'ouvre pas en plein écran ;
 * - pas de commandes natives, pas de plein écran, d'incrustation ni de diffusion sur un autre écran ;
 * - muette par défaut, démarre seulement quand elle est visible et se met en pause en sortant de l'écran ;
 * - si l'appareil demande moins d'animations, elle attend un clic ;
 * - taille plafonnée à 80 % de la hauteur de l'écran.
 */
export function VideoPresentation({ src, poster }: { src: string; poster?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [userPaused, setUserPaused] = useState(false);
  const pausedByUser = useRef(false);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      pausedByUser.current = true;
      setUserPaused(true);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.intersectionRatio >= 0.45 && !pausedByUser.current) v.play().catch(() => undefined);
        else if (entry.intersectionRatio < 0.45) v.pause();
      },
      { threshold: [0, 0.45, 1] },
    );
    observer.observe(v);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    // Un navigateur qui tenterait quand même le plein écran est ramené dans la page.
    const onFullscreen = () => {
      if (document.fullscreenElement === v) document.exitFullscreen().catch(() => undefined);
    };
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      observer.disconnect();
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, []);

  const togglePlay = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      pausedByUser.current = false;
      setUserPaused(false);
      v.play().catch(() => undefined);
    } else {
      pausedByUser.current = true;
      setUserPaused(true);
      v.pause();
    }
  };
  const toggleSound = () => {
    const v = video.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    // Activer le son relance depuis le début : on entend la présentation en entier.
    if (!v.muted) {
      v.currentTime = 0;
      pausedByUser.current = false;
      setUserPaused(false);
      v.play().catch(() => undefined);
    }
  };
  const restart = () => {
    const v = video.current;
    if (!v) return;
    v.currentTime = 0;
    pausedByUser.current = false;
    setUserPaused(false);
    v.play().catch(() => undefined);
  };

  const bouton =
    "grid size-10 cursor-pointer place-items-center rounded-full bg-nuit/70 text-creme ring-1 ring-creme/15 backdrop-blur-md transition hover:bg-nuit/90 focus-visible:outline-2 focus-visible:outline-lagon";

  return (
    <div
      className="relative mx-auto w-full overflow-hidden rounded-2xl bg-nuit-2 shadow-[0_50px_140px_-30px_rgba(0,0,0,0.9)] ring-1 ring-creme/10"
      style={{ maxWidth: "min(100%, calc(80vh * 16 / 9))" }}
    >
      <video
        ref={video}
        className="block aspect-video w-full object-cover"
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        disablePictureInPicture
        disableRemotePlayback
        controlsList="nofullscreen nodownload noremoteplayback noplaybackrate"
        onDoubleClick={(e) => e.preventDefault()}
        onClick={togglePlay}
        aria-label="Présentation de sebt en une minute"
      />

      {/* Gros bouton de lecture quand la vidéo attend un clic. */}
      {!playing && userPaused ? (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 grid cursor-pointer place-items-center bg-nuit/30"
          aria-label="Lancer la vidéo"
        >
          <span className="grid size-16 place-items-center rounded-full bg-lagon text-nuit shadow-xl">
            <Play className="ml-1 size-7" fill="currentColor" />
          </span>
        </button>
      ) : null}

      <div className="absolute right-3 bottom-3 flex gap-2">
        <button type="button" onClick={restart} className={bouton} aria-label="Revoir depuis le début">
          <RotateCcw className="size-4" />
        </button>
        <button type="button" onClick={togglePlay} className={bouton} aria-label={playing ? "Mettre en pause" : "Lire"}>
          {playing ? <Pause className="size-4" fill="currentColor" /> : <Play className="ml-0.5 size-4" fill="currentColor" />}
        </button>
        <button type="button" onClick={toggleSound} className={bouton} aria-label={muted ? "Activer le son" : "Couper le son"}>
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
      </div>
    </div>
  );
}
