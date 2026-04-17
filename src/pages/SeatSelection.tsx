import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Armchair, Luggage, Utensils, Wifi, PackageOpen, ChevronRight, LuggageIcon } from 'lucide-react';
import type { PassengerProfile } from '../types/booking.types';
import SiteHeader from '../components/layout/SiteHeader';
import BookingStepper from '../components/booking/BookingStepper';
import SiteFooter from '../components/layout/SiteFooter';
import AircraftSeatsMap from '../components/booking/AircraftSeatsMap';
import AdditionalService from '../components/booking/AdditionalService';

const MOCK_PASSENGERS: PassengerProfile[] = [
  { id: '1', fullName: 'Arthur Wellesley', seat: '2A' },
  { id: '2', fullName: 'Jane Austen', seat: undefined },
];


const ADD_ON_SERVICES = [
  {
    id: 'extra-baggage',
    name: 'Hành lý thêm',
    description: '20kg hành lý ký gửi',
    price: '£45',
    icon: Luggage,
  },
  {
    id: 'meal-upgrade',
    name: 'Nâng cấp bữa ăn',
    description: 'Premium meal service',
    price: '£35',
    icon: Utensils,
  },
  {
    id: 'wifi-pass',
    name: 'Wifi không giới hạn',
    description: 'Internet suốt chuyến bay',
    price: '£12',
    icon: Wifi,
  },
  {
    id: 'lounge-access',
    name: 'Truy cập Lounge VIP',
    description: 'Sovereign Platinum Lounge',
    price: '£99',
    icon: PackageOpen,
  },
];

export default function SeatSelection() {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [isSeatSelecting, setIsSeatSelecting] = useState(true);
  const [isServiceSelecting, setIsServiceSelecting] = useState(false);

  const totalServicePrice = selectedServices.reduce((total, serviceId) => {
    const service = ADD_ON_SERVICES.find((s) => s.id === serviceId);
    if (!service) return total;
    const price = parseInt(service.price.replace('£', ''));
    return total + price;
  }, 0);

  return (
    <div className="relative min-h-screen bg-surface font-body text-on-surface antialiased">
      <SiteHeader />
      <div className="relative z-10 mx-auto max-w-4xl px-6 pt-28" />
      <BookingStepper current="select" />
      <main className="relative z-10 mx-auto grid max-w-400 grid-cols-1 gap-8 px-6 pb-16 lg:grid-cols-12 lg:px-12">
        <div className="mb-8 flex flex-col space-y-6 lg:col-span-7 lg:mb-0">
          <div className="rounded-xl border border-luxury-gold/10 bg-white/60 p-6 shadow-sm backdrop-blur-md">
            <p className="mb-4 text-[0.6875rem] font-bold uppercase tracking-[0.15em] text-secondary">
              Select Passenger
            </p>
            <div className="flex flex-wrap gap-4">
              {MOCK_PASSENGERS.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  className={`flex items-center space-x-3 rounded-lg border-2 px-6 py-3 ${
                    idx === 0
                      ? 'border-midnight-burgundy bg-midnight-burgundy/5'
                      : 'border-transparent bg-surface-container-low hover:border-luxury-gold/30'
                  }`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-midnight-burgundy text-xs font-bold text-white">
                    {idx + 1}
                  </span>
                  <div className="text-left">
                    <p className="text-sm font-bold leading-none text-midnight-burgundy">
                      {p.fullName}
                    </p>
                    {p.seat ? (
                      <p className="mt-1 text-[0.625rem] font-bold uppercase tracking-tighter text-luxury-gold">
                        Seat: {p.seat}
                      </p>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </div>
          {/* Seat Selection */}
          <button className="rounded-xl border border-luxury-gold/10 bg-white/60 p-6 shadow-sm backdrop-blur-md flex flex-row items-center gap-6 hover:shadow-lg duration-200" onClick={() => { setIsSeatSelecting(true); setIsServiceSelecting(false);}}>
              <Armchair className="h-20 w-20 p-4 rounded-xl text-luxury-gold bg-midnight-burgundy" strokeWidth={1.5} />
              <div className="flex flex-col items-start">
                <h2 className="mb-2 font-headline text-xl font-black text-midnight-burgundy">
                  Chọn ghế ngồi
                </h2>
                <p className="text-sm text-on-surface-variant">
                  Chọn chỗ ngồi yêu thích của bạn trên máy bay.
                </p>
              </div>
              <ChevronRight className="ml-auto h-10 w-10 text-on-surface-variant" strokeWidth={1.5} />
          </button>
          {/* Additional Services */}
          <button className="rounded-xl border border-luxury-gold/10 bg-white/60 p-6 shadow-sm backdrop-blur-md flex flex-row items-center gap-6 hover:shadow-lg duration-200" onClick={() => { setIsServiceSelecting(true); setIsSeatSelecting(false); }}>
              <LuggageIcon className="h-20 w-20 p-4 rounded-xl text-luxury-gold bg-midnight-burgundy" strokeWidth={1.5} />
              <div className="flex flex-col items-start">
                <h2 className="mb-2 font-headline text-xl font-black text-midnight-burgundy">
                  Chọn dịch vụ bổ sung
                </h2>
                <p className="text-sm text-on-surface-variant">
                  Thêm hành lý, bữa ăn, wifi và nhiều hơn nữa.
                </p>
              </div>
              <ChevronRight className="ml-auto h-10 w-10 text-on-surface-variant" strokeWidth={1.5} />
          </button>

          <div className=" rounded-xl border border-luxury-gold/20 bg-surface-container-lowest p-6 shadow-lg">
            <h3 className="mb-4 font-headline text-lg font-black text-on-surface">Tóm tắt</h3>
            <p className="text-sm text-on-surface-variant">London → Dubai • SV-204</p>
            <p className="mt-6 text-2xl font-black text-secondary">£2,890</p>
            <p className="text-xs text-on-surface-variant">Business • 1 khách</p>

            {/* Seat Selection Summary */}
            {selectedSeat && (
              <div className="mt-4 rounded-lg bg-midnight-burgundy/10 p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-midnight-burgundy">
                  Ghế đã chọn
                </p>
                <p className="mt-1 text-lg font-black text-secondary">{selectedSeat}</p>
              </div>
            )}

            {/* Services Summary */}
            {selectedServices.length > 0 && (
              <div className="mt-6 space-y-2 border-t border-outline-variant/20 pt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Dịch vụ bổ sung
                </p>
                {selectedServices.map((serviceId) => {
                  const service = ADD_ON_SERVICES.find((s) => s.id === serviceId);
                  return service ? (
                    <div key={serviceId} className="flex justify-between text-sm">
                      <span className="text-on-surface-variant">{service.name}</span>
                      <span className="font-bold text-secondary">{service.price}</span>
                    </div>
                  ) : null;
                })}
                <div className="border-t border-outline-variant/20 pt-2">
                  <div className="flex justify-between font-bold text-midnight-burgundy">
                    <span>Dịch vụ:</span>
                    <span>£{totalServicePrice}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 h-15 gap-5 flex flex-row">
              <Link
                to="/home"
                className="inline-flex w-50 items-center justify-center gap-2 rounded-md px-4 bg-cabin-silver">
                Hủy
              </Link>
              <Link 
                to="/booking/checkout" 
                className="inline-flex w-full items-center justify-center gap-2 rounded-md px-4 auth-primary-btn text-white hover:bg-midnight-burgundy/90 transition-all">
                Thanh toán
              </Link>
            </div>
          </div>
        </div>
        <aside className="lg:col-span-5">
          {isSeatSelecting && <AircraftSeatsMap onSeatSelect={(seatId) => setSelectedSeat(seatId)} crSeatId={selectedSeat} />}
          {isServiceSelecting && <AdditionalService onSelectServices={(serviceIds) => setSelectedServices(serviceIds)} crServiceIds={selectedServices}/>}
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}
