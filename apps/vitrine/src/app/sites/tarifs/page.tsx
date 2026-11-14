import { redirect } from "next/navigation";

// Les sites sont désormais réalisés sur devis : plus de grille de prix publique.
export default function PageTarifsSites() {
  redirect("/sites#sur-mesure");
}
