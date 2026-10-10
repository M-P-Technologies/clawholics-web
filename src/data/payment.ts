// What the payment screen calls each Xendit channel code from /settings/payment
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  GCASH: "GCash",
  PAYMAYA: "Maya",
  GRABPAY: "GrabPay",
  SHOPEEPAY: "ShopeePay",
  CREDIT_CARD: "Credit or debit card",
  QRPH: "QR Ph",
};

// Shown when the settings can't be loaded; the server still checks the method
export const FALLBACK_PAYMENT_METHODS = ["GCASH"];
