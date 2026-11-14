import type { Metadata } from "next";

import { Showcase } from "@/components/design-system/showcase";

export const metadata: Metadata = { title: "Design system" };

export default function DesignSystemPage() {
  return <Showcase />;
}
