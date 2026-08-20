import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { SITE, CONTACT } from "@/lib/config";
import type { Order } from "@/lib/types";

/**
 * Server-rendered invoice PDF for a placed order. No GSTIN on file for the
 * business, so this is a plain retail invoice (prices shown as tax-inclusive)
 * rather than a GST tax invoice — add gstin/hsn fields here if that changes.
 *
 * Amounts use "Rs." rather than the ₹ glyph: react-pdf's built-in Helvetica
 * (the standard 14 PDF fonts) has no Rupee-sign glyph, so ₹ silently prints
 * as a stray tofu character — this is the site-wide formatINR() rendered
 * everywhere else, kept separate here for that reason.
 */
function formatMoney(amount: number): string {
  return `Rs. ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount)}`;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: "#1A1A1A", fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  brand: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  brandGold: { color: "#C9A24A" },
  small: { color: "#6B6B6B", marginTop: 2 },
  title: { fontSize: 14, fontFamily: "Helvetica-Bold", textAlign: "right" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", textAlign: "right", marginTop: 4 },
  metaLabel: { color: "#6B6B6B", marginRight: 6 },
  section: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  sectionTitle: { fontFamily: "Helvetica-Bold", marginBottom: 4, color: "#6B6B6B", fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5 },
  table: { marginTop: 8 },
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#1A1A1A", paddingBottom: 6, fontFamily: "Helvetica-Bold" },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E5E0D8", paddingVertical: 8 },
  colItem: { flex: 3 },
  colQty: { flex: 1, textAlign: "center" },
  colPrice: { flex: 1.2, textAlign: "right" },
  colTotal: { flex: 1.2, textAlign: "right" },
  itemBrand: { color: "#6B6B6B", marginTop: 2, fontSize: 9 },
  totals: { marginTop: 16, alignSelf: "flex-end", width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grandTotalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: "#1A1A1A", fontFamily: "Helvetica-Bold", fontSize: 12 },
  footer: { position: "absolute", bottom: 40, left: 40, right: 40, textAlign: "center", color: "#6B6B6B", fontSize: 9 },
  taxNote: { color: "#6B6B6B", fontSize: 8.5, marginTop: 16 },
});

const PAYMENT_LABELS: Record<string, string> = {
  cod: "Cash on Delivery",
  upi: "UPI",
  bank_transfer: "Bank Transfer (NEFT/IMPS)",
  card: "Card / Net Banking",
};

function InvoiceDocument({ order }: { order: Order }) {
  const date = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(order.createdAt));

  return (
    <Document title={`Invoice ${order.id}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>
              {SITE.name.replace("365", "")}
              <Text style={styles.brandGold}>365</Text>
            </Text>
            {CONTACT.addressLines.map((line) => (
              <Text key={line} style={styles.small}>
                {line}
              </Text>
            ))}
            <Text style={styles.small}>{CONTACT.phoneDisplay}</Text>
          </View>
          <View>
            <Text style={styles.title}>TAX INVOICE</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Invoice No.</Text>
              <Text>{order.id}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text>{date}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Payment</Text>
              <Text>{PAYMENT_LABELS[order.details.paymentMethod] ?? order.details.paymentMethod}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View>
            <Text style={styles.sectionTitle}>Billed to</Text>
            <Text>{order.details.name}</Text>
            <Text style={styles.small}>{order.details.addressLine1}</Text>
            {order.details.addressLine2 ? (
              <Text style={styles.small}>{order.details.addressLine2}</Text>
            ) : null}
            <Text style={styles.small}>
              {order.details.city}, {order.details.state} {order.details.pincode}
            </Text>
            <Text style={styles.small}>{order.details.phone}</Text>
            {order.details.email ? <Text style={styles.small}>{order.details.email}</Text> : null}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colItem}>Item</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colPrice}>Price</Text>
            <Text style={styles.colTotal}>Amount</Text>
          </View>
          {order.items.map((item) => (
            <View key={item.productId} style={styles.tableRow}>
              <View style={styles.colItem}>
                <Text>{item.title}</Text>
                <Text style={styles.itemBrand}>{item.brandName}</Text>
              </View>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{formatMoney(item.price)}</Text>
              <Text style={styles.colTotal}>{formatMoney(item.price * item.quantity)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{formatMoney(order.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Shipping</Text>
            <Text>{order.shipping === 0 ? "Free" : formatMoney(order.shipping)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text>Total</Text>
            <Text>{formatMoney(order.total)}</Text>
          </View>
        </View>

        <Text style={styles.taxNote}>
          Prices are inclusive of all applicable taxes. This is a computer-generated invoice and does
          not require a signature.
        </Text>

        <Text style={styles.footer}>
          Thank you for shopping with {SITE.name}. Questions about this order? WhatsApp us at{" "}
          {CONTACT.phoneDisplay}.
        </Text>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(order: Order): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument order={order} />);
}
