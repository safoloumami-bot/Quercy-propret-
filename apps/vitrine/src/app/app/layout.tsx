import type { Metadata } from "next";
import { Coque } from "@/components/app/Coque";

export const metadata: Metadata = { title: "Espace client" };

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return <Coque>{children}</Coque>;
}
