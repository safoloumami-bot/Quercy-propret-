import { Entete } from "@/components/marketing/Entete";
import { Pied } from "@/components/marketing/Pied";
import { DonneesLogiciel } from "@/components/marketing/DonneesStructurees";
import { Presentation } from "@/components/marketing/Presentation";
import {
  HeroLogiciel, PromessesLogiciel, Modules, Assistant, FactureElectronique, Terrain, CorpsDeMetier, Partout, Securite, TarifsLogiciel, SitesWeb, FaqLogiciel, AppelLogiciel,
} from "@/components/marketing/Logiciel";

export default function Accueil() {
  return (
    <div className="min-h-screen bg-nuit text-creme">
      <DonneesLogiciel />
      <Entete />
      <main>
        <HeroLogiciel />
        <PromessesLogiciel />
        <Presentation />
        <Modules />
        <CorpsDeMetier />
        <Assistant />
        <Terrain />
        <FactureElectronique />
        <Partout />
        <Securite />
        <TarifsLogiciel />
        <SitesWeb />
        <FaqLogiciel />
        <AppelLogiciel />
      </main>
      <Pied />
    </div>
  );
}
