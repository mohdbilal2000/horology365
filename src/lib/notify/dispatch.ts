import { buildOrderPdf } from "@/lib/pdf/invoice";
import { saveOrder } from "@/lib/orders/repo";
import { invoiceUrl } from "@/lib/orders/invoiceLink";
import { sendOrderEmails, type EmailResult } from "./email";
import { sendOrderWhatsApps, type WhatsAppResult } from "./whatsapp";
import type { Order } from "@/lib/types";

/**
 * Everything that happens after an order validates: persist it, render the
 * invoice, and push that invoice to the customer and the store over both
 * channels.
 *
 * Ordering matters. The order is persisted first so a delivery outage can never
 * lose the order itself, and the two channels then run concurrently — neither
 * is allowed to block or fail the other, because each is an independent copy of
 * the record.
 */

export interface DispatchReport {
  orderId: string;
  /** Signed URL where the PDF can be downloaded. */
  invoiceUrl: string;
  persistence: { durable: boolean; journaled: boolean; error?: string };
  email: EmailResult;
  whatsapp: WhatsAppResult;
  /** True when at least one copy of the order made it somewhere off this server. */
  recorded: boolean;
}

export async function dispatchOrder(order: Order): Promise<DispatchReport> {
  const persistence = await saveOrder(order);

  const pdf = buildOrderPdf(order);

  const [email, whatsapp] = await Promise.all([
    sendOrderEmails(order, pdf).catch((err): EmailResult => {
      console.error("[dispatch] email channel threw:", err);
      return {
        sent: false,
        recipients: [],
        error: err instanceof Error ? err.message : String(err),
      };
    }),
    sendOrderWhatsApps(order, pdf).catch((err): WhatsAppResult => {
      console.error("[dispatch] whatsapp channel threw:", err);
      return {
        sent: false,
        recipients: [],
        error: err instanceof Error ? err.message : String(err),
      };
    }),
  ]);

  const report: DispatchReport = {
    orderId: order.id,
    invoiceUrl: invoiceUrl(order.id),
    persistence,
    email,
    whatsapp,
    recorded: persistence.durable || email.sent || whatsapp.sent,
  };

  // A loud log line is the last line of defence: if every channel is down, the
  // order still exists in the server logs with enough detail to fulfil it.
  if (!report.recorded) {
    console.error(
      "[dispatch] ORDER NOT RECORDED ANYWHERE DURABLE:",
      JSON.stringify({ order, report }),
    );
  } else {
    console.info(
      `[dispatch] ${order.id} · db=${persistence.durable} · email=${email.recipients.length} · whatsapp=${whatsapp.recipients.length}`,
    );
  }

  return report;
}
