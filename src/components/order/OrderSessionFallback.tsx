"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { OrderConfirmation } from "@/components/order/OrderConfirmation";
import type { Order } from "@/lib/types";

interface OrderSessionFallbackProps {
  id: string;
}

/**
 * Pre-Supabase-setup safety net: reads the order the checkout page stashed
 * into sessionStorage right after placing it. Only reached when the server
 * lookup (`getOrderById`) found nothing AND Supabase isn't configured yet —
 * i.e. before the business owner has run the backend setup.
 */
export function OrderSessionFallback({ id }: OrderSessionFallbackProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`order:${id}`);
      if (raw) setOrder(JSON.parse(raw) as Order);
    } catch {
      setOrder(null);
    } finally {
      setLoaded(true);
    }
  }, [id]);

  if (!loaded) {
    return (
      <div className="band-light">
        <div className="shell flex min-h-[50vh] items-center justify-center py-20">
          <p className="text-ink-500">Loading your order…</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="band-light">
        <div className="shell flex min-h-[50vh] flex-col items-center justify-center gap-4 py-20 text-center">
          <h1 className="font-serif text-3xl">Order not found</h1>
          <p className="max-w-sm text-ink-500">
            We couldn’t find order <span className="font-mono">{id}</span> in this
            session. If you’ve just paid, check your email or WhatsApp for the
            confirmation.
          </p>
          <Link href="/" className="btn-gold">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  // The invoice route reads from Supabase — unavailable pre-setup, when this
  // fallback path is the one being used at all.
  return <OrderConfirmation order={order} downloadable={false} />;
}
