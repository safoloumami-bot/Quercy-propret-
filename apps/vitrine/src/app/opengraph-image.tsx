import { ImageResponse } from "next/og";
import { marque } from "@/config/marque";

// Image affichée quand un lien vers le site est partagé (WhatsApp, LinkedIn, SMS…).
export const alt = `${marque.nom} : le logiciel de gestion des TPE et PME`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "linear-gradient(135deg, #110e0b 0%, #231e19 60%, #3a332b 100%)",
          color: "#f5efe4",
        }}
      >
        <div style={{ display: "flex", fontSize: 44, fontWeight: 700, color: "#e2c99f", letterSpacing: -1 }}>{marque.nom}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 700, lineHeight: 1.05, letterSpacing: -3 }}>Toute votre entreprise.</div>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 700, lineHeight: 1.05, letterSpacing: -3, color: "#c9a97c" }}>Un seul logiciel.</div>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#a89e8f" }}>
          Devis, factures, plannings, terrain, stocks et trésorerie · Gratuit pour démarrer
        </div>
      </div>
    ),
    size,
  );
}
