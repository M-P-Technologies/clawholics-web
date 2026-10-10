import { listPaymentProofs, uploadPaymentProof } from "@/server/handlers/payments";

export const dynamic = "force-dynamic";

export const GET = listPaymentProofs;
export const POST = uploadPaymentProof;
