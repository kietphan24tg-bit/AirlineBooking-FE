export interface PaymentMethodMeta {
  holdDurationMinutes: number;
  fee: number;
}

export interface PaymentMethod {
  code: string;
  label: string;
  provider: string;
  icon: string | null;
  supported: boolean;
  meta: PaymentMethodMeta | null;
}

export interface PaymentMethodGroup {
  type: string;
  label: string;
  methods: PaymentMethod[];
}

export interface ActivePayLaterSession {
  paymentId: number;
  expireAt: string;
}

export interface PaymentMethodsResponse {
  groups: PaymentMethodGroup[];
  activePayLater?: ActivePayLaterSession | null;
}
