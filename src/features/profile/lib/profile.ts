import type { ProofSummary } from "../../payments/api/proofService";

export interface Appointment {
  id: number;
  service_name: string;
  nailist_id: number;
  nailist_name: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  invoice_url?: string;
  expires_at?: string;
  service_price?: number;
  created_at?: string;
  proof_due_at?: string | null;
  latest_proof?: ProofSummary | null;
}
