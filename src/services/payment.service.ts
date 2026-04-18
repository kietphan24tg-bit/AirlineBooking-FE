import api from '../api/axios';

export type PaymentCardPayload = {
  cardHolder: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
};

/**
 * Submits card payment to the backend. Throws on network / HTTP errors.
 */
export async function submitPayment(payload: PaymentCardPayload): Promise<void> {
  await api.post('/api/payments', payload);
}
