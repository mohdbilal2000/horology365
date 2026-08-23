import { PdfBuilder, PAGE_WIDTH, PAGE_HEIGHT, rgb, measure, wrap } from "./writer";
import { SITE, CONTACT, UPI } from "@/lib/config";
import type { Order } from "@/lib/types";

/** Brand palette, mirroring the champagne-gold / ink tokens in tailwind.config.ts. */
const GOLD = rgb(0.784, 0.647, 0.357);
const INK = rgb(0.043, 0.043, 0.051);
const MUTED = rgb(0.42, 0.42, 0.46);
const RULE = rgb(0.85, 0.85, 0.85);
const BONE = rgb(0.969, 0.961, 0.941);

const MARGIN = 48;
const RIGHT = PAGE_WIDTH - MARGIN;

/**
 * Formats rupees for the PDF. The standard PDF fonts have no rupee glyph, so we
 * write "INR" rather than emitting a "?" where the symbol should be.
 */
function inr(amount: number): string {
  return `INR ${amount.toLocaleString("en-IN")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Renders the customer-facing order confirmation / invoice.
 *
 * The same document goes to the customer and to the store, so it has to carry
 * everything either party needs to reconcile an order later: line items, the
 * payment method and UPI reference, the delivery address and a contact number.
 */
export function buildOrderPdf(order: Order): Buffer {
  const pdf = new PdfBuilder();
  pdf.newPage();

  // ── Header band ──
  pdf.rect(0, PAGE_HEIGHT - 108, PAGE_WIDTH, 108, INK);
  pdf.text("Horology", MARGIN, PAGE_HEIGHT - 58, {
    size: 24,
    font: "Helvetica-Bold",
    color: BONE,
  });
  pdf.text(
    "365",
    MARGIN + measure("Horology", 24, "Helvetica-Bold"),
    PAGE_HEIGHT - 58,
    { size: 24, font: "Helvetica-Bold", color: GOLD },
  );
  pdf.text(SITE.tagline, MARGIN, PAGE_HEIGHT - 76, { size: 9, color: rgb(0.7, 0.7, 0.72) });

  pdf.textRight("ORDER CONFIRMATION", RIGHT, PAGE_HEIGHT - 52, {
    size: 11,
    font: "Helvetica-Bold",
    color: GOLD,
  });
  pdf.textRight(order.id, RIGHT, PAGE_HEIGHT - 68, { size: 10, color: BONE });
  pdf.textRight(formatDate(order.createdAt), RIGHT, PAGE_HEIGHT - 82, {
    size: 8.5,
    color: rgb(0.7, 0.7, 0.72),
  });

  let y = PAGE_HEIGHT - 148;

  // ── Billing / shipping columns ──
  const colGap = 24;
  const colWidth = (RIGHT - MARGIN - colGap) / 2;
  const rightColX = MARGIN + colWidth + colGap;

  pdf.text("DELIVER TO", MARGIN, y, { size: 8.5, font: "Helvetica-Bold", color: MUTED });
  pdf.text("SOLD BY", rightColX, y, { size: 8.5, font: "Helvetica-Bold", color: MUTED });
  y -= 16;

  const d = order.details;
  const shipTo = [
    d.name,
    d.addressLine1,
    d.addressLine2,
    `${d.city}, ${d.state} ${d.pincode}`,
    `Phone: ${d.phone}`,
    d.email ? `Email: ${d.email}` : undefined,
  ].filter((v): v is string => Boolean(v));

  const soldBy = [...CONTACT.addressLines, `Phone: ${CONTACT.phoneDisplay}`, SITE.url];

  // Each column advances its own cursor, so a line that wraps pushes only that
  // column down instead of overprinting the next entry.
  const renderColumn = (entries: string[], x: number): number => {
    let cursor = y;
    entries.forEach((entry, i) => {
      const font = i === 0 ? "Helvetica-Bold" : "Helvetica";
      for (const ln of wrap(entry, 9.5, font, colWidth)) {
        pdf.text(ln, x, cursor, {
          size: 9.5,
          font,
          color: i === 0 ? INK : rgb(0.25, 0.25, 0.28),
        });
        cursor -= 13;
      }
    });
    return cursor;
  };

  y = Math.min(renderColumn(shipTo, MARGIN), renderColumn(soldBy, rightColX));
  y -= 18;

  // ── Line items ──
  const qtyX = RIGHT - 190;
  const priceX = RIGHT - 110;
  const totalX = RIGHT;

  pdf.rect(MARGIN, y - 5, RIGHT - MARGIN, 22, rgb(0.96, 0.955, 0.94));
  pdf.text("ITEM", MARGIN + 8, y + 2, { size: 8.5, font: "Helvetica-Bold", color: MUTED });
  pdf.textRight("QTY", qtyX, y + 2, { size: 8.5, font: "Helvetica-Bold", color: MUTED });
  pdf.textRight("PRICE", priceX, y + 2, { size: 8.5, font: "Helvetica-Bold", color: MUTED });
  pdf.textRight("AMOUNT", totalX - 8, y + 2, {
    size: 8.5,
    font: "Helvetica-Bold",
    color: MUTED,
  });
  y -= 26;

  const itemWidth = qtyX - MARGIN - 24;
  for (const item of order.items) {
    // Start a new page before a row would run into the footer area.
    if (y < 150) {
      pdf.newPage();
      y = PAGE_HEIGHT - MARGIN - 20;
    }
    const titleLines = wrap(item.title, 10, "Helvetica-Bold", itemWidth);
    const first = titleLines[0] ?? item.title;
    pdf.text(first, MARGIN + 8, y, { size: 10, font: "Helvetica-Bold", color: INK });
    pdf.textRight(String(item.quantity), qtyX, y, { size: 10, color: INK });
    pdf.textRight(inr(item.price), priceX, y, { size: 10, color: INK });
    pdf.textRight(inr(item.price * item.quantity), totalX - 8, y, {
      size: 10,
      font: "Helvetica-Bold",
      color: INK,
    });
    y -= 12;

    for (const extra of titleLines.slice(1)) {
      pdf.text(extra, MARGIN + 8, y, { size: 10, font: "Helvetica-Bold", color: INK });
      y -= 12;
    }

    const meta = [item.brandName, item.isPreorder ? "Pre-order" : undefined]
      .filter(Boolean)
      .join("  ·  ");
    pdf.text(meta, MARGIN + 8, y, { size: 8.5, color: MUTED });
    y -= 16;
    pdf.line(MARGIN + 8, y, RIGHT - 8, y, RULE, 0.5);
    y -= 12;
  }

  // ── Totals ──
  y -= 4;
  const labelX = RIGHT - 118;
  const totalsRow = (label: string, value: string, bold = false) => {
    pdf.textRight(label, labelX, y, {
      size: bold ? 11 : 9.5,
      font: bold ? "Helvetica-Bold" : "Helvetica",
      color: bold ? INK : MUTED,
    });
    pdf.textRight(value, totalX - 8, y, {
      size: bold ? 11 : 9.5,
      font: bold ? "Helvetica-Bold" : "Helvetica",
      color: INK,
    });
    y -= bold ? 18 : 15;
  };

  totalsRow("Subtotal", inr(order.subtotal));
  totalsRow("Shipping", order.shipping === 0 ? "Free" : inr(order.shipping));
  pdf.line(labelX - 60, y + 8, RIGHT - 8, y + 8, RULE, 0.7);
  y -= 4;
  totalsRow("Total", inr(order.total), true);

  // ── Payment summary ──
  y -= 10;
  pdf.rect(MARGIN, y - 52, RIGHT - MARGIN, 58, rgb(0.98, 0.965, 0.93));
  pdf.text("PAYMENT", MARGIN + 12, y - 8, {
    size: 8.5,
    font: "Helvetica-Bold",
    color: GOLD,
  });

  const paidByUpi = order.details.paymentMethod === "upi";
  pdf.text(
    paidByUpi ? `UPI to ${UPI.vpa}` : "Cash on Delivery",
    MARGIN + 12,
    y - 24,
    { size: 10, font: "Helvetica-Bold", color: INK },
  );
  pdf.text(
    paidByUpi
      ? order.details.upiReference
        ? `Reference / UTR: ${order.details.upiReference}`
        : "Reference pending"
      : `Keep ${inr(order.total)} ready at delivery.`,
    MARGIN + 12,
    y - 38,
    { size: 9, color: rgb(0.25, 0.25, 0.28) },
  );

  pdf.textRight(`STATUS: ${order.status.toUpperCase()}`, RIGHT - 12, y - 24, {
    size: 9.5,
    font: "Helvetica-Bold",
    color: paidByUpi && order.status === "pending" ? MUTED : INK,
  });
  if (paidByUpi && order.status === "pending") {
    pdf.textRight("Verifying payment before dispatch", RIGHT - 12, y - 38, {
      size: 8.5,
      color: MUTED,
    });
  }

  // ── Footer ──
  pdf.line(MARGIN, 74, RIGHT, 74, RULE, 0.7);
  pdf.text(
    `Questions? WhatsApp ${CONTACT.phoneDisplay} quoting ${order.id}.`,
    MARGIN,
    58,
    { size: 8.5, color: MUTED },
  );
  pdf.text(
    "This is a computer-generated confirmation and does not require a signature.",
    MARGIN,
    46,
    { size: 8, color: rgb(0.6, 0.6, 0.63) },
  );
  pdf.textRight(SITE.url.replace(/^https?:\/\//, ""), RIGHT, 58, {
    size: 8.5,
    font: "Helvetica-Bold",
    color: GOLD,
  });

  return pdf.build();
}

/** Stable, human-readable filename used for the email attachment and WhatsApp doc. */
export function orderPdfFilename(order: Order): string {
  return `${order.id}.pdf`;
}
