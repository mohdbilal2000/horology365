import type { CartItem, CheckoutDetails, PaymentMethod } from "@/lib/types";

export type FieldErrors = Partial<Record<keyof CheckoutDetails, string>>;

const PHONE_RE = /^[6-9]\d{9}$/;
const PINCODE_RE = /^\d{6}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAYMENT_METHODS: PaymentMethod[] = ["cod", "upi", "bank_transfer", "card"];

/** Validate checkout details. Shared by the client form and the API route. */
export function validateCheckout(input: Partial<CheckoutDetails>): {
  ok: boolean;
  errors: FieldErrors;
} {
  const errors: FieldErrors = {};

  if (!input.name || input.name.trim().length < 2) {
    errors.name = "Please enter your full name.";
  }
  if (!input.phone || !PHONE_RE.test(input.phone.replace(/\s/g, ""))) {
    errors.phone = "Enter a valid 10-digit mobile number.";
  }
  if (input.email && input.email.trim() && !EMAIL_RE.test(input.email.trim())) {
    errors.email = "Enter a valid email or leave it blank.";
  }
  if (!input.addressLine1 || input.addressLine1.trim().length < 5) {
    errors.addressLine1 = "Enter your street address.";
  }
  if (!input.city || input.city.trim().length < 2) {
    errors.city = "Enter your city.";
  }
  if (!input.state || input.state.trim().length < 2) {
    errors.state = "Enter your state.";
  }
  if (!input.pincode || !PINCODE_RE.test(input.pincode.trim())) {
    errors.pincode = "Enter a valid 6-digit PIN code.";
  }
  if (!input.paymentMethod || !PAYMENT_METHODS.includes(input.paymentMethod)) {
    errors.paymentMethod = "Choose a payment method.";
  }

  // UPI and bank-transfer orders must carry a reference entered after paying,
  // since both are manually reconciled against a bank statement.
  if (input.paymentMethod === "upi" || input.paymentMethod === "bank_transfer") {
    const ref = (input.upiReference ?? "").trim();
    if (ref.length < 8) {
      errors.upiReference =
        input.paymentMethod === "upi"
          ? "Enter the UPI reference / UTR from your payment app."
          : "Enter the transfer reference number from your bank.";
    }
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

/** Validate the cart payload server-side (never trust the client). */
export function validateCartItems(items: unknown): items is CartItem[] {
  if (!Array.isArray(items) || items.length === 0) return false;
  return items.every((item) => {
    if (typeof item !== "object" || item === null) return false;
    const i = item as Record<string, unknown>;
    return (
      typeof i.productId === "string" &&
      typeof i.price === "number" &&
      i.price > 0 &&
      typeof i.quantity === "number" &&
      i.quantity > 0 &&
      i.quantity <= 10
    );
  });
}
