export const CONTACT_FEEDBACK = {
  success: {
    title: "Message sent",
    message:
      "Thank you for reaching out! We received your message and will reply to the email address you gave us. If you don't see our reply, please check your spam folder.",
  },
  networkError: {
    title: "No connection",
    message:
      "We couldn't send your message because the connection was lost. Your text is still in the form, so you can try again as soon as you are back online.",
  },
  generalError: {
    title: "Message not sent",
    message:
      "Something went wrong on our side, so your message was not sent. Your text is still in the form. Please try again in a moment, or message us on social media instead.",
  },
  invalidEmail: {
    title: "Check your email address",
    message:
      "That email address doesn't look right, so we couldn't send your message. Please use the format name@example.com.",
  },
} satisfies Record<"success" | "networkError" | "generalError" | "invalidEmail", { title: string; message: string }>;

export type ContactFeedback = keyof typeof CONTACT_FEEDBACK | null;
