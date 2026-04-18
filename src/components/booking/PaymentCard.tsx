import { Lock } from 'lucide-react';
import Button from '../../components/ui/Button';
import FieldLabel from '../../components/ui/FieldLabel';
import TextInput from '../../components/ui/TextInput';

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

interface PaymentCardProps {
  onClose: () => void;
}

export default function PaymentCard({ onClose }: PaymentCardProps) {
  const handleComplete = () => {
    // Logic xử lý payment
    onClose(); // Đóng card khi hoàn thành
  };

  return (
    <div className="fixed inset-0 min-h-svh z-100 items-center justify-center bg-black/40 flex flex-row">
        <div className="bg-white rounded-lg shadow-lg p-8 mx-4 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
            <div>
                <FieldLabel htmlFor="cardHolder" className="mb-2 font-semibold text-sm text-gray-700">
                    Tên trên thẻ
                </FieldLabel>
                <TextInput id="cardHolder" placeholder="Nhập tên trên thẻ" className="mb-4" />
                <FieldLabel htmlFor="cardNumber" className="mb-2 font-semibold text-sm text-gray-700">
                    Số thẻ
                </FieldLabel>
                <TextInput id="cardNumber" placeholder="Nhập số thẻ" className="mb-4" />
                <div className="flex space-x-4 mb-4">
                    <div className="flex-1">
                        <FieldLabel htmlFor="expiryMonth" className="mb-2 font-semibold text-sm text-gray-700">
                            Tháng hết hạn
                        </FieldLabel>
                        <TextInput id="expiryMonth" placeholder="MM" className="mb-4" />
                    </div>
                    <div className="flex-1">
                        <FieldLabel htmlFor="expiryYear" className="mb-2 font-semibold text-sm text-gray-700">
                            Năm hết hạn
                        </FieldLabel>
                        <TextInput id="expiryYear" placeholder="YY" className="mb-4" />
                    </div>
                </div>
                <FieldLabel htmlFor="cvv" className="mb-2 font-semibold text-sm text-gray-700">
                    CVV
                </FieldLabel>
                <TextInput id="cvv" placeholder="123" type="password" className="mb-4" />
                <Button
                    type="submit"
                    className="w-full bg-secondary text-black hover:bg-secondary/90"
                    icon={<Lock className="h-4 w-4" strokeWidth={2} />}
                    onClick={handleComplete}
                >
                    Thanh toán ngay
                </Button>
            </div>
            <div className="sticky top-28 rounded-xl border border-luxury-gold/20 bg-white p-6 shadow-lg">
              <div className="mb-6 flex items-center gap-2">
                <Lock className="h-5 w-5 text-luxury-gold" strokeWidth={1.5} />
                <span className="text-xs font-bold uppercase tracking-widest text-luxury-gold">
                  Thanh toán an toàn
                </span>
              </div>

              {/* QR Code Section */}
              <div className="mb-6 flex flex-col items-center rounded-lg border border-luxury-gold/30 bg-luxury-gold/5 p-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-on-surface">
                  Quét để thanh toán
                </p>
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://airline-booking.sovereign.local/payment/order-svg204"
                  alt="QR Code Thanh Toán"
                  className="h-32 w-32 rounded-md"
                />
                <p className="mt-3 text-[9px] text-on-surface-variant">Order: SV-204</p>
              </div>

              <div className="border-t border-outline-variant/20 pt-3">
                <div className="flex justify-between">
                  <span className="font-bold text-on-surface">Tổng</span>
                  <span className="text-xl font-black text-secondary">£3,268</span>
                </div>
              </div>        
              <p className="mt-6 text-[10px] text-on-surface-variant">
                Thanh toán này được bảo vệ bởi các tiêu chuẩn bảo mật quốc tế.
              </p>
            </div>

        </div>
            

        
    </div>
  );
}
