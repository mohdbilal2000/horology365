import type { Metadata } from "next";
import { SettingsPanel } from "@/components/admin/SettingsPanel";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

// Settings are read fresh each visit (never statically cached).
export const dynamic = "force-dynamic";

export default function AdminSettingsPage() {
  return <SettingsPanel />;
}
