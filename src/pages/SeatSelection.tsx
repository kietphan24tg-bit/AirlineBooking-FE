import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Armchair, Luggage, Utensils, Wifi, PackageOpen } from 'lucide-react';
import AmbientSweep from '../components/layout/AmbientSweep';
import Button from '../components/ui/Button';
import type { PassengerProfile } from '../types/booking.types';
import SiteHeader from '../components/layout/SiteHeader';
import BookingStepper from '../components/booking/BookingStepper';
import SiteFooter from '../components/layout/SiteFooter';

const MOCK_PASSENGERS: PassengerProfile[] = [
  { id: '1', fullName: 'Arthur Wellesley', seat: '2A' },
  { id: '2', fullName: 'Jane Austen', seat: undefined },
];

const SEAT_ROWS = ['A', 'B', 'C', '', 'D', 'E', 'F'] as const;
const SEAT_NUMS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

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

function SeatCell({
  id,
  taken,
  selected,
  onSelect,
}: {
  id: string;
  taken?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  if (id === '') {
    return <div className="w-10" />;
  }
  return (
    <button
      type="button"
      disabled={taken}
      onClick={() => onSelect?.()}
      className={`flex h-10 w-10 items-center justify-center rounded-md text-[10px] font-bold transition-all ${
        taken
          ? 'cursor-not-allowed bg-surface-container-high text-on-surface-variant/50'
          : selected
            ? 'border-2 border-midnight-burgundy bg-midnight-burgundy text-white'
            : 'border border-luxury-gold/30 bg-surface-container-lowest text-midnight-burgundy hover:border-midnight-burgundy hover:bg-midnight-burgundy/5'
      }`}
    >
      {id}
    </button>
  );
}

export default function SeatSelection() {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);

  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  };

  const handleSeatSelect = (seatId: string) => {
    setSelectedSeat((prev) => (prev === seatId ? null : seatId));
  };

  const totalServicePrice = selectedServices.reduce((total, serviceId) => {
    const service = ADD_ON_SERVICES.find((s) => s.id === serviceId);
    if (!service) return total;
    const price = parseInt(service.price.replace('£', ''));
    return total + price;
  }, 0);

  return (
    <div className="relative min-h-screen bg-surface font-body text-on-surface antialiased">
      <AmbientSweep />
      <SiteHeader />
      <div className="relative z-10 mx-auto max-w-4xl px-6 pt-28" />
      <BookingStepper current="details" />
      <main className="relative z-10 mx-auto grid max-w-360 grid-cols-1 gap-8 px-6 pb-16 lg:grid-cols-12 lg:px-12">
        <div className="mb-8 flex flex-col space-y-6 lg:col-span-8 lg:mb-0">
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
          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-headline text-xl font-black text-midnight-burgundy">
                Cabin layout
              </h2>
              <Armchair className="h-6 w-6 text-luxury-gold" strokeWidth={1.5} />
            </div>
            <div className="seat-map-container max-h-105 overflow-auto rounded-lg bg-surface-container-low p-4">
              <div className="mx-auto flex max-w-md flex-col gap-2">
                <div className="mb-4 rounded-lg bg-midnight-burgundy/10 py-2 text-center text-xs font-bold uppercase tracking-widest text-midnight-burgundy">
                  First — Forward
                </div>
                {SEAT_NUMS.map((row) => (
                  <div key={row} className="flex items-center justify-center gap-2">
                    <span className="w-6 text-center text-xs text-on-surface-variant">{row}</span>
                    {SEAT_ROWS.map((col, i) => {
                      const label = col ? `${row}${col}` : '';
                      const taken = label === '1A' || label === '1B';
                      return (
                        <SeatCell
                          key={`${row}-${i}`}
                          id={label}
                          taken={taken || false}
                          selected={selectedSeat === label}
                          onSelect={() => handleSeatSelect(label)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-sm">
            <h2 className="mb-6 font-headline text-xl font-black text-midnight-burgundy">
              Dịch vụ bổ sung
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {ADD_ON_SERVICES.map((service) => {
                const Icon = service.icon;
                const isSelected = selectedServices.includes(service.id);
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service.id)}
                    className={`cursor-pointer rounded-lg border-2 p-4 transition-all text-left ${
                      isSelected
                        ? 'border-midnight-burgundy bg-midnight-burgundy/5'
                        : 'border-outline-variant/20 bg-surface-container-low hover:border-luxury-gold/30'
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Icon className="mt-0.5 h-5 w-5 text-luxury-gold" strokeWidth={1.5} />
                        <div>
                          <h3 className="font-bold text-midnight-burgundy">{service.name}</h3>
                          <p className="mt-1 text-xs text-on-surface-variant">
                            {service.description}
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleService(service.id)}
                        className="cursor-pointer"
                      />
                    </div>
                    <p className="text-right font-bold text-secondary">{service.price}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <aside className="lg:col-span-4">
          <div className="sticky top-28 rounded-xl border border-luxury-gold/20 bg-surface-container-lowest p-6 shadow-lg">
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

            <div className="mt-8 space-y-3">
              <Link to="/booking/checkout">
                <Button className="block w-full rounded-md border border-outline-variant/30 py-3 text-center text-sm font-semibold text-white hover:bg-surface-container-low">
                  Thanh toán
                </Button>
              </Link>

              <Link
                to="/home"
                className="block w-full mt-4 rounded-md border border-outline-variant/30 py-3 text-center text-sm font-semibold text-on-surface hover:bg-surface-container-low"
              >
                Hủy
              </Link>
            </div>
          </div>
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}
