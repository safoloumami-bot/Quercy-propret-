"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "@/components/ui";

// Fait apparaître son contenu au défilement (fondu + léger glissement de 12 px).
// Le mouvement est retiré si l'utilisateur a demandé « réduire les animations » (voir globals.css).
export function Apparition({
  children,
  delai = 0,
  className,
  as: Balise = "div",
}: {
  children: ReactNode;
  delai?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entree]) => {
        if (entree?.isIntersecting) {
          el.classList.add("visible");
          obs.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Balise
      // @ts-expect-error : la ref est compatible avec les trois balises autorisées
      ref={ref}
      className={cx("revele", className)}
      style={{ "--delai": `${delai}ms` } as React.CSSProperties}
    >
      {children}
    </Balise>
  );
}
