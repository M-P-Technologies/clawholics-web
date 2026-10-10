import type { AppointmentStatus } from "../services/appointmentService";

export interface Appointment {
  service_name: string;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
}

export interface PaymentDetails {
  amount: number;
  payment_method: string;
  status: string;

  service_name: string;
  appointment_date: string;
  appointment_time: string;

  first_name: string;
  last_name: string;

  email: string;
}
