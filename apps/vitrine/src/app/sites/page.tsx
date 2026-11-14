import type { Metadata } from "next";
import { Entete } from "@/components/marketing/Entete";
import { Pied } from "@/components/marketing/Pied";
import { Hero } from "@/components/marketing/Hero";
import { SurMesure } from "@/components/marketing/SurMesure";
import { PromessesSites, Faq, AppelFinal } from "@/components/marketing/Sections";

export const metadata: Metadata = {
  title: "Sites et applis sur mesure",
  description: "Voyez votre site en une minute, puis notre équipe le réalise avec vous : hébergement, domaine et emails gérés. Applis et logo sur demande.",
};

export default function PageSites() {
  return (
    <div className="min-h-screen bg-nuit text-creme">
      <Entete espace="sites" />
      <main>
        <div id="createur" className="scroll-mt-16">
          <Hero />
        </div>
        <PromessesSites />
        <SurMesure />
        <div id="questions" className="scroll-mt-16">
          <Faq />
        </div>
        <AppelFinal />
      </main>
      <Pied />
    </div>
  );
}
