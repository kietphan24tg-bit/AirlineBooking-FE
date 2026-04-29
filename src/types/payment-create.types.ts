export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED' | 'CANCELED';

export interface PaymentEntity {
  id: number;
  paymentId?: number;
  bookingId: number;
  amount: number;
  currency: string;
  method: string;
  status: PaymentStatus | string;
  expireAt: string; // ISO datetime
  transactionId: string | null;
  qrData: string | null;
  qrImageUrl?: string | null;
  paymentUrl?: string | null;
}

export interface PaymentAction {
  type: string;
  qrData: string | null;
  qrImageUrl: string | null;
  paymentUrl: string | null;
}

export interface CreatePaymentRequest {
  bookingId: string | number;
  method: string;
}

export interface CreatePaymentResponse {
  payment: PaymentEntity;
  action: PaymentAction;
}

export interface GetPaymentResponse {
  payment: PaymentEntity;
  action?: PaymentAction;
}

export interface CancelPaymentResponse {
  id?: number;
  paymentId?: number;
  bookingId: number;
  amount: number;
  currency: string;
  method: string;
  status: PaymentStatus | string;
  paidAt: string | null;
  expireAt: string;
  transactionId: string | null;
  qrData: string | null;
  qrImageUrl: string | null;
  paymentUrl: string | null;
}
