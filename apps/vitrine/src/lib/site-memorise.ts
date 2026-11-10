// Le site généré sur la landing est conservé pour l'inscription, sans le régénérer.

import type { SiteGenere } from "@/lib/generateur";

const CLE = "sebt-site-genere";

export function memoriserSite(projet: string, site: SiteGenere) {
  try {
    sessionStorage.setItem(CLE, JSON.stringify({ projet, site }));
  } catch {
    /* navigation privée */
  }
}

export function siteMemorise(projet: string): SiteGenere | null {
  try {
    const d = JSON.parse(sessionStorage.getItem(CLE) ?? "null");
    return d?.projet === projet ? (d.site as SiteGenere) : null;
  } catch {
    return null;
  }
}
