export interface CheckoutFormValues {
  paymentMethod: { value: string; label: string } | null;
  cardHolder: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  billingAddress: string;
  city: string;
  postalCode: string;
  country: { value: string; label: string } | null;
  acceptTerms: boolean;
}
