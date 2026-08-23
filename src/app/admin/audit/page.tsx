import type { Metadata } from "next";
import { listAudit } from "@/lib/admin/audit";
import { isSupabaseConfigured } from "@/lib/storage/supabase";
import { journalIsDurable, journalLocation } from "@/lib/storage/journal";
import { AuditTable } from "@/components/admin/AuditTable";

export const metadata: Metadata = {
  title: "Audit log",
  robots: { index: false, follow: false },
};

// The log changes on every admin action, so never serve a cached copy.
export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const entries = await listAudit(300);
  const durable = isSupabaseConfigured();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
          Audit log
        </h1>
        <p className="mt-1 max-w-2xl text-ink-500">
          Every change made in the admin, oldest kept forever. Entries are only
          ever added — nothing here can be edited or deleted, including by an
          admin, so you always have a full history of what changed and when.
        </p>
      </div>

      {durable ? null : (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          <strong>This log is not yet permanently stored.</strong> Entries are
          appended to{" "}
          <code className="font-mono text-xs">{journalLocation()}</code>
          {journalIsDurable()
            ? ", which survives restarts on this server."
            : ", which is wiped on every redeploy of a serverless host."}{" "}
          Configure Supabase to keep the history permanently.
        </p>
      )}

      <AuditTable entries={entries} />
    </div>
  );
}
