import type { CSSProperties, ReactNode } from "react";
import { cx } from "@/components/ui";

// Fait apparaître son contenu au défilement (fondu + léger glissement de 12 px), en CSS seul :
// rien n'est masqué en attendant le JavaScript (voir « .revele » dans globals.css).
// Le mouvement est retiré si l'utilisateur a demandé « réduire les animations ».
export function Apparition({
  children,
  delai = 0,
  className,
  as: Balise = "div",
}: {
  children: ReactNode;
  /** Conservé pour les appels existants : sans effet depuis l'animation liée au défilement. */
  delai?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  return (
    <Balise className={cx("revele", className)} style={{ "--delai": `${delai}ms` } as CSSProperties}>
      {children}
    </Balise>
  );
}
