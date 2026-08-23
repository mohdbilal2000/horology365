import type { Metadata } from "next";
import { TrashBoard } from "@/components/admin/TrashBoard";

export const metadata: Metadata = {
  title: "Removed products",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function TrashPage() {
  return <TrashBoard />;
}
