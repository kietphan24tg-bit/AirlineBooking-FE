import { Download, FileText, Plane, Settings2, X } from 'lucide-react';
import type { TripDetailResult } from '../../types/booking.types';

interface TripDetailSidebarProps {
  trip: TripDetailResult | null;
  isOpen: boolean;
  isLoading?: boolean;
  onClose: () => void;
}

function formatMoney(amount: number, currency: string): string {
  return `${amount.toLocaleString('en-US')} ${currency}`;
}

function formatDateTime(value: string): { date: string; time: string } {
  const date = new Date(value);
  return {
    date: date.toLocaleDateString('en-US'),
    time: date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes}m`;
  if (minutes <= 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export default function TripDetailSidebar({
  trip,
  isOpen,
  isLoading = false,
  onClose,
}: TripDetailSidebarProps) {
  if (!trip && !isLoading) return null;

  const departure = trip ? formatDateTime(trip.segment.departureTime) : null;
  const arrival = trip ? formatDateTime(trip.segment.arrivalTime) : null;

  return (
    <>
      <div
        className={`fixed inset-0 z-[1000] bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed right-0 top-0 z-[1001] flex h-screen w-[500px] max-w-full flex-col bg-white shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-5">
          <div>
            <div className="text-base font-bold">Booking details</div>
            <div className="text-sm text-gray-600">
              PNR: {trip?.booking.pnrCode ?? 'Loading...'}
            </div>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-700 transition-all hover:bg-error hover:text-white"
            onClick={onClose}
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {isLoading || !trip ? (
            <div className="rounded-xl border border-luxury-gold/14 bg-surface-lowest p-6 text-sm text-on-surface-variant">
              Loading trip details...
            </div>
          ) : (
            <>
              <div className="mb-8">
                <div className="rounded-xl bg-gray-50 p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {trip.segment.departureAirportCode}
                      </div>
                      <div className="mt-1 text-xs text-gray-600">{trip.segment.departureCity}</div>
                    </div>
                    <div className="flex flex-1 items-center justify-center gap-2">
                      <div className="h-px max-w-14 flex-1 bg-luxury-gold/45" />
                      <Plane className="h-4 w-4 rotate-45 text-midnight-burgundy" strokeWidth={1.9} />
                      <div className="h-px max-w-14 flex-1 bg-luxury-gold/45" />
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {trip.segment.arrivalAirportCode}
                      </div>
                      <div className="mt-1 text-xs text-gray-600">{trip.segment.arrivalCity}</div>
                    </div>
                  </div>
                  <div className="flex justify-between text-[13px] text-gray-600">
                    <div className="text-center">
                      <div className="mb-1 text-base font-bold text-gray-900">{departure?.time}</div>
                      <div>{departure?.date}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600">
                        {formatDuration(trip.segment.durationMinutes)}
                      </div>
                      <div>Non-stop</div>
                    </div>
                    <div className="text-center">
                      <div className="mb-1 text-base font-bold text-gray-900">{arrival?.time}</div>
                      <div>{arrival?.date}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-center gap-4 border-t border-gray-200 pt-3 text-xs text-gray-600">
                    <span>{trip.segment.flightNumber}</span>
                    <span>•</span>
                    <span>{trip.segment.cabinClass}</span>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <div className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-600">
                  Passengers ({trip.passengers.length})
                </div>
                <ul className="space-y-0">
                  {trip.passengers.map((passenger, idx) => (
                    <li key={passenger.passengerId} className="flex items-center border-b border-gray-100 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{passenger.fullName}</div>
                          <div className="text-xs text-gray-600">{passenger.passengerType}</div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-8">
                <div className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-600">
                  Ticket information
                </div>
                <div className="space-y-2.5 text-[13px]">
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Ticket number</span>
                    <span className="text-right font-medium">
                      {trip.passengers.map((passenger) => passenger.ticket?.ticketNumber).filter(Boolean).join(', ')}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Fare type</span>
                    <span className="text-right font-medium">{trip.segment.fareClassName}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Checked baggage</span>
                    <span className="text-right font-medium">
                      {trip.segment.checkedBaggageKg ?? 0} kg per passenger
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <div className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-600">Payment</div>
                <div className="space-y-2.5 text-[13px]">
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Total</span>
                    <span className="text-right font-medium">
                      {formatMoney(trip.payment.amount, trip.payment.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Payment method</span>
                    <span className="text-right font-medium">{trip.payment.paymentMethod ?? 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Transaction ID</span>
                    <span className="text-right font-medium">{trip.payment.transactionId ?? 'N/A'}</span>
                  </div>
                  <div className="mt-2 flex justify-between border-t-2 border-gray-200 pt-4">
                    <span className="text-sm font-bold">{trip.payment.paymentStatusLabel}</span>
                    <span className="text-lg font-bold text-error">
                      {formatMoney(trip.payment.amount, trip.payment.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-gray-200 bg-white px-6 py-5">
          <div className="flex justify-around gap-4">
            <button className="group flex flex-1 flex-col items-center gap-2 py-3 text-gray-600 transition-all hover:text-primary">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-lg transition-all group-hover:bg-pink-50 group-hover:text-primary">
                <Settings2 className="h-4 w-4" strokeWidth={1.9} />
              </div>
              <span className="text-xs">Manage booking</span>
            </button>
            <button className="group flex flex-1 flex-col items-center gap-2 py-3 text-gray-600 transition-all hover:text-primary">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-lg transition-all group-hover:bg-pink-50 group-hover:text-primary">
                <FileText className="h-4 w-4" strokeWidth={1.9} />
              </div>
              <span className="text-xs">View e-ticket</span>
            </button>
            <button className="group flex flex-1 flex-col items-center gap-2 py-3 text-gray-600 transition-all hover:text-primary">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-lg transition-all group-hover:bg-pink-50 group-hover:text-primary">
                <Download className="h-4 w-4" strokeWidth={1.9} />
              </div>
              <span className="text-xs">Download invoice</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
