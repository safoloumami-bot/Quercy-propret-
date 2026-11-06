import type { Metadata } from "next";

import { AdminTrades } from "@/components/admin/admin-trades";

export const metadata: Metadata = { title: "Corps de métier · Administration" };

export default function AdminTradesPage() {
  return <AdminTrades />;
}
