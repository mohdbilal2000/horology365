import "server-only";
import { renderInvoicePdf } from "@/lib/invoice";
import { invoiceUrl } from "@/lib/orders/invoiceLink";
import { sendOrderEmails, type EmailResult } from "./email";
import { sendOrderWhatsApps, type WhatsAppResult } from "./whatsapp";
import type { Order } from "@/lib/types";

/**
 * Renders an order's invoice and pushes it to the customer and the store over
 * both channels.
 *
 * Called after the order has already been persisted, and deliberately never
 * throws: the customer may have paid by this point, so a mail outage must not
 * turn into a failed order. Each channel is independent — one going down does
 * not stop the other — and each is itself a durable copy of the record, which
 * is the point of sending to the store as well as the buyer.
 */

export interface DispatchReport {
  invoiceUrl: string;
  email: EmailResult;
  whatsapp: WhatsAppResult;
  /** True when at least one copy reached someone. */
  delivered: boolean;
}

export async function dispatchOrder(order: Order): Promise<DispatchReport> {
  const pdf = await renderInvoicePdf(order);

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
    invoiceUrl: invoiceUrl(order.id),
    email,
    whatsapp,
    delivered: email.sent || whatsapp.sent,
  };

  console.info(
    `[dispatch] ${order.id} · email=${email.recipients.length} · whatsapp=${whatsapp.recipients.length}`,
  );
  return report;
}
