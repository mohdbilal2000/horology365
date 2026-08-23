import type { Metadata } from "next";
import { BackupPanel } from "@/components/admin/BackupPanel";

export const metadata: Metadata = {
  title: "Backup",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function BackupPage() {
  return <BackupPanel />;
}
