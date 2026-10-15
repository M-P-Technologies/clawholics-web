// What the payment screen calls each Xendit channel code from /settings/payment
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  GCASH: "GCash",
  PAYMAYA: "Maya",
  GRABPAY: "GrabPay",
  SHOPEEPAY: "ShopeePay",
  CREDIT_CARD: "Credit or debit card",
  QRPH: "QR Ph",
};

// The only way to pay on the payment screen: customers scan a QR Ph code with any bank or
// e-wallet app. The salon's enabled channels from /settings/payment are narrowed to these.
export const OFFERED_PAYMENT_METHODS = ["QRPH"];

// A line under the method's name
export const PAYMENT_METHOD_HINTS: Record<string, string> = {
  QRPH: "Scan with any bank or e-wallet app",
};
