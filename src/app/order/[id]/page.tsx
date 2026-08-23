import Link from "next/link";
import { getOrderById } from "@/lib/data/orders";
import { isDatabaseConfigured } from "@/lib/db/client";
import { OrderConfirmation } from "@/components/order/OrderConfirmation";
import { invoicePath } from "@/lib/orders/invoiceLink";
import { EMAIL_ENABLED, WHATSAPP_ENABLED } from "@/lib/config";
import { OrderSessionFallback } from "@/components/order/OrderSessionFallback";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderConfirmationPage({ params }: PageProps) {
  const { id } = await params;
  const order = await getOrderById(id);

  if (order) {
    // The invoice link has to be signed — the route rejects it otherwise. Only
    // claim a channel that is actually configured, so the page never tells a
    // customer to check an inbox nothing was sent to.
    return (
      <OrderConfirmation
        order={order}
        invoiceHref={invoicePath(order.id)}
        sentTo={{
          email: EMAIL_ENABLED ? order.details.email : undefined,
          whatsapp: WHATSAPP_ENABLED,
        }}
      />
    );
  }

  // Supabase not set up yet — fall back to the sessionStorage the checkout
  // page wrote right after placing the order (same-tab only, pre-setup).
  if (!isDatabaseConfigured()) {
    return <OrderSessionFallback id={id} />;
  }

  return (
    <div className="band-light">
      <div className="shell flex min-h-[50vh] flex-col items-center justify-center gap-4 py-20 text-center">
        <h1 className="font-serif text-3xl">Order not found</h1>
        <p className="max-w-sm text-ink-500">
          We couldn’t find order <span className="font-mono">{id}</span>. If
          you’ve just paid, check your email or WhatsApp for the confirmation.
        </p>
        <Link href="/" className="btn-gold">
          Back to home
        </Link>
      </div>
    </div>
  );
}
