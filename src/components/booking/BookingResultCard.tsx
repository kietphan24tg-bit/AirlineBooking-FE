import {
  Armchair,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleX,
  Clock,
  Mail,
  Phone,
  Plane,
  PlaneTakeoff,
  SquareCheckBig,
} from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBookingStore } from '../../stores/useBookingStore';
import type {
  BookingLookupResponse,
  BookingLookupSeatAssignment,
  BookingLookupServiceSelection,
} from '../../types/booking.types';

type BookingPassenger = BookingLookupResponse['passengers'][number];
type BookingActions = BookingLookupResponse['actions'];

interface StatusDisplay {
  textClass: string;
  iconBgClass: string;
  showSuccessIcon: boolean;
  caption: string;
}

function resolveStatusDisplay(status: string): StatusDisplay {
  const normalized = (status ?? '').toUpperCase();

  switch (normalized) {
    case 'CONFIRMED':
    case 'COMPLETED':
      return {
        textClass: 'text-green-600',
        iconBgClass: 'bg-green-500',
        showSuccessIcon: true,
        caption: 'This booking has been confirmed and paid.',
      };
    case 'CHECKED_IN':
      return {
        textClass: 'text-emerald-700',
        iconBgClass: 'bg-emerald-600',
        showSuccessIcon: true,
        caption: 'Passengers have completed online check-in.',
      };
    case 'CANCELLED':
      return {
        textClass: 'text-red-600',
        iconBgClass: 'bg-red-500',
        showSuccessIcon: false,
        caption: 'This booking has been cancelled. Contact support if you need a refund.',
      };
    case 'PENDING_PAYMENT':
    case 'PENDING':
      return {
        textClass: 'text-amber-600',
        iconBgClass: 'bg-amber-500',
        showSuccessIcon: false,
        caption: 'This booking is awaiting payment. Complete it before the hold expires.',
      };
    default:
      return {
        textClass: 'text-on-surface',
        iconBgClass: 'bg-surface-container-high',
        showSuccessIcon: false,
        caption: 'Booking status',
      };
  }
}

interface ManageAction {
  key: string;
  enabled: boolean;
  label: string;
  description: string;
  icon: typeof SquareCheckBig;
  iconClass: string;
  borderHoverClass?: string;
  textClass?: string;
  chevronClass?: string;
  onClick: () => void;
}

interface ManageActionNavigationState {
  bookingId: number;
  pnrCode: string;
  lastName: string;
  expiresAt: string | null;
}

function buildManageActions(
  actions: BookingActions,
  navigate: (path: string) => void
): ManageAction[] {
  return [
    {
      key: 'check-in',
      enabled: actions.canCheckIn,
      label: 'Online check-in',
      description: 'Check in online and receive your boarding pass',
      icon: SquareCheckBig,
      iconClass: 'bg-midnight-burgundy stroke-luxury-gold',
      onClick: () => navigate('/manage-booking/check-in'),
    },
    {
      key: 'ancillaries',
      enabled: actions.canBuyAncillaries || Boolean(actions.canBuyAancillaries),
      label: 'Add extras',
      description: 'Baggage, meals',
      icon: PlaneTakeoff,
      iconClass: 'bg-midnight-burgundy stroke-luxury-gold',
      onClick: () => navigate('/manage-booking/add-services'),
    },
    {
      key: 'seat',
      enabled: actions.canSelectSeat,
      label: 'Choose seats',
      description: 'Pick a comfortable seat for your trip',
      icon: Armchair,
      iconClass: 'bg-midnight-burgundy stroke-luxury-gold',
      onClick: () => navigate('/manage-booking/seat-selection'),
    },
    {
      key: 'change-flight',
      enabled: actions.canChangeFlight,
      label: 'Change flight',
      description: 'Change the date, time, or itinerary',
      icon: PlaneTakeoff,
      iconClass: 'bg-midnight-burgundy stroke-luxury-gold',
      onClick: () => navigate('/manage-booking/change-flight'),
    },
    {
      key: 'cancel',
      enabled: actions.canCancel,
      label: 'Cancel flight',
      description: 'Cancel the trip and request a refund',
      icon: CircleX,
      iconClass: 'bg-midnight-burgundy stroke-red-300',
      textClass: 'text-on-surface',
      onClick: () => navigate('/manage-booking/cancel'),
    },
  ];
}

function getPassengerSeats(passenger: BookingPassenger): BookingLookupSeatAssignment[] {
  return passenger.selections?.seats ?? passenger.seatAssignments ?? [];
}

function getPassengerServices(passenger: BookingPassenger): BookingLookupServiceSelection[] {
  return passenger.selections?.services ?? passenger.serviceSelections ?? [];
}

function formatMoney(amount: number, currency: string): string {
  return `${new Intl.NumberFormat('vi-VN').format(amount)} ${currency}`;
}

function formatPassengerType(type: string): string {
  switch ((type ?? '').toUpperCase()) {
    case 'ADULT':
      return 'Adult';
    case 'CHILD':
      return 'Child';
    case 'INFANT':
      return 'Infant';
    default:
      return type;
  }
}

function PassengerCard({
  passenger,
  index,
  email,
  phone,
  carryOnWeight,
}: {
  passenger: BookingPassenger;
  index: number;
  email: string;
  phone: string;
  carryOnWeight: number;
}) {
  const seats = getPassengerSeats(passenger);
  const services = getPassengerServices(passenger);
  const fullName = `${passenger.lastName} ${passenger.firstName}`.trim();
  const serviceLabels = services.map((service) =>
    service.optionName
      ? `${service.optionName} x${service.quantity}`
      : service.serviceName
        ? `${service.serviceName}${service.quantity > 1 ? ` x${service.quantity}` : ''}`
        : 'Service'
  );

  return (
    <article className="rounded-2xl border border-[#e8ebf0] bg-white px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-6">
      <div className="hidden" />
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-[#d8dee8] bg-[#f8fafc] px-3 text-xs font-bold tracking-[0.16em] text-[#64748b]">
                {String(index).padStart(2, '0')}
              </span>
              <div className="space-y-1">
                <h3 className="text-lg font-bold uppercase tracking-[0.02em] text-[#0f172a] sm:text-[1.2rem]">
                  {fullName}
                </h3>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-[#64748b]">
              <span>{formatPassengerType(passenger.passengerType)}</span>
              <span className="h-1 w-1 rounded-full bg-[#cbd5e1]" />
              <span>{passenger.dateOfBirth}</span>
            </div>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#d7f0df] bg-[#f5fbf7] px-3 py-1.5 text-xs font-semibold text-[#0f8a5f]">
            <span className="h-2 w-2 rounded-full bg-[#10b981]" />
            Confirmed
          </span>
        </div>

        <div className="grid gap-3 border-t border-[#eef2f7] pt-4 text-sm text-on-surface sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl border border-[#edf1f5] bg-[#fafbfd] px-4 py-3">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-[#edf1f5] bg-white text-[#64748b]">
              <Mail className="h-4 w-4 shrink-0" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#94a3b8]">
                Email
              </p>
              <p className="mt-1 truncate text-sm font-medium text-[#0f172a]">{email}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-[#edf1f5] bg-[#fafbfd] px-4 py-3">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-[#edf1f5] bg-white text-[#64748b]">
              <Phone className="h-4 w-4 shrink-0" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#94a3b8]">
                Phone
              </p>
              <p className="mt-1 truncate text-sm font-medium text-[#0f172a]">{phone}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {seats.length > 0 ? (
            <span className="inline-flex rounded-full border border-[#dbe3ec] bg-[#f8fafc] px-3 py-1.5 text-sm font-medium text-[#334155]">
              Seat {seats.map((seat) => seat.seatNumber).join(', ')}
            </span>
          ) : null}

          <span className="inline-flex rounded-full border border-[#dbe3ec] bg-[#f8fafc] px-3 py-1.5 text-sm font-medium text-[#334155]">
            {carryOnWeight}kg included
          </span>

          {serviceLabels.map((label) => (
            <span
              key={`${passenger.passengerId}-${label}`}
              className="inline-flex rounded-full border border-[#dbe3ec] bg-[#f8fafc] px-3 py-1.5 text-sm font-medium text-[#334155]"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

export default function BookingResultCard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPriceDetail, setShowPriceDetail] = useState(false);
  const bookingLookup = useBookingStore((state) => state.bookingLookup);

  if (!bookingLookup) return null;

  const { booking, paymentDetails, itineraries, passengers, primaryContact, actions } =
    bookingLookup;
  const price = paymentDetails.price;
  const status = resolveStatusDisplay(booking.status);
  const manageActionState: ManageActionNavigationState = {
    bookingId: booking.bookingId,
    pnrCode: booking.pnrCode,
    lastName: passengers[0]?.lastName ?? '',
    expiresAt: booking.expiresAt,
  };
  const manageActions = buildManageActions(actions, (path) =>
    navigate(
      {
        pathname: path,
        search: location.search,
      },
      { state: manageActionState }
    )
  );
  const enabledManageActions = manageActions.filter((action) => action.enabled);

  return (
    <div className="flex flex-row gap-4 overflow-hidden bg-surface-container-lowest/90">
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col rounded-xl bg-white p-7">
          <div className="flex flex-row items-start justify-between">
            <div className="flex flex-col">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Booking status
              </p>
              <div className="mt-1 flex items-center gap-2">
                {status.showSuccessIcon ? (
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full ${status.iconBgClass}`}
                  >
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                ) : null}
                <div className="flex flex-col">
                  <h1 className={`text-lg font-bold ${status.textClass}`}>{booking.statusLabel}</h1>
                  <p className="mt-0.5 text-xs text-on-surface-variant">{status.caption}</p>
                  {booking.expiresAt ? (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-600">
                      <Clock className="h-3 w-3" /> Expires: {booking.expiresAt}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Booking reference (PNR)
              </p>
              <h1 className="mt-1 text-lg font-bold text-on-surface">{booking.pnrCode}</h1>
            </div>

            <button
              type="button"
              className="relative flex cursor-pointer flex-col text-left"
              onClick={() => setShowPriceDetail(!showPriceDetail)}
            >
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Total amount
              </p>
              <div className="mt-1 flex items-center gap-1">
                <h1 className="text-lg font-bold text-midnight-burgundy">
                  {formatMoney(price.total, price.currency)}
                </h1>
                {showPriceDetail ? (
                  <ChevronUp className="h-4 w-4 text-midnight-burgundy" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-midnight-burgundy" />
                )}
              </div>

              {showPriceDetail ? (
                <div className="absolute right-0 top-full z-10 mt-2 flex w-64 animate-in flex-col rounded-lg border border-gray-100 bg-white p-4 text-sm shadow-xl fade-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Base fare:</span>
                      <span className="font-medium">
                        {formatMoney(price.baseFare, price.currency)}
                      </span>
                    </div>
                    {price.discount !== 0 ? (
                      <div className="flex justify-between text-green-600">
                        <span>Discount:</span>
                        <span className="font-medium">
                          {formatMoney(price.discount, price.currency)}
                        </span>
                      </div>
                    ) : null}
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Taxes:</span>
                      <span className="font-medium">{formatMoney(price.tax, price.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Service fee:</span>
                      <span className="font-medium">
                        {formatMoney(price.serviceFee, price.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Seat selection fee:</span>
                      <span className="font-medium">
                        {formatMoney(price.seatFee, price.currency)}
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between border-t border-gray-100 pt-2">
                      <span className="text-base font-bold">Grand total:</span>
                      <span className="text-base font-bold text-midnight-burgundy">
                        {formatMoney(price.total, price.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </button>
          </div>
        </div>

        <div className="flex flex-col rounded-xl bg-white p-7">
          <p className="text-sm font-bold text-on-surface-variant">Flight information</p>
          {itineraries.map((itin, idx) => {
            const isReturn = idx > 0;
            const date = new Date(itin.departureTime);
            const dateStr = date.toLocaleDateString('vi-VN');
            const depTime = date.toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            });
            const arrTime = new Date(itin.arrivalTime).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div key={itin.flightId} className="mb-5 mt-5 flex flex-row">
                <div className="flex w-40 flex-col items-center justify-center">
                  <div className="flex w-23 items-center justify-center rounded-sm bg-secondary-fixed">
                    {isReturn ? 'Return' : 'Outbound'}
                  </div>
                  <p className="text-xs text-on-surface-variant">Date</p>
                  <p className="font-bold text-on-surface">{dateStr}</p>
                </div>

                <div className="flex flex-1 flex-row justify-between border-l border-r border-gray-100">
                  <div className="flex w-40 flex-col p-3 text-left">
                    <p className="text-md font-bold text-on-surface">{depTime}</p>
                    <p>{itin.departureAirportCode}</p>
                    <p className="text-[9pt] text-gray-500">{itin.departureCity}</p>
                  </div>

                  <div className="flex flex-col items-center justify-center p-3">
                    <p>{itin.flightNumber}</p>
                    <div className="flex flex-row items-center justify-center">
                      <div className="w-30 border-t-2 border-dashed border-gray-400" />
                      <Plane className="rotate-45 fill-luxury-gold stroke-midnight-burgundy" />
                      <div className="w-30 border-t-2 border-dashed border-gray-400" />
                    </div>
                  </div>

                  <div className="flex w-40 flex-col p-3 text-right">
                    <p className="text-md font-bold text-on-surface">{arrTime}</p>
                    <p>{itin.arrivalAirportCode}</p>
                    <p className="text-[9pt] text-gray-500">{itin.arrivalCity}</p>
                  </div>
                </div>

                <div className="flex w-50 flex-col items-start justify-center pl-3">
                  <p>Fare: {itin.fareName}</p>
                  <p>Status: {itin.flightStatus}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col rounded-xl bg-white p-7">
          <p className="mb-2 text-base font-semibold text-[#0f172a]">Passenger list</p>
          <p className="mb-6 max-w-2xl text-sm leading-6 text-[#64748b]">
            Contact details and included services for each passenger.
          </p>
          <div className="space-y-4">
            {passengers.map((passenger, idx) => (
              <PassengerCard
                key={passenger.passengerId}
                passenger={passenger}
                index={idx + 1}
                email={primaryContact.email}
                phone={primaryContact.phone}
                carryOnWeight={itineraries[0]?.fareBenefits.baggageHandKg || 7}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col rounded-xl bg-white p-7">
        <p className="mb-4 text-xl font-bold">Manage booking</p>

        {enabledManageActions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-on-surface-variant">
            No actions are currently available for status{' '}
            <span className="font-semibold">{booking.statusLabel}</span>.
          </p>
        ) : (
          enabledManageActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.key}
                className={`mb-4 flex flex-row items-center justify-between rounded-xl border-2 border-cabin-silver p-5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-xl ${
                  action.borderHoverClass ?? ''
                }`}
                onClick={action.onClick}
              >
                <div className="flex flex-row items-center">
                  <Icon className={`size-12 rounded-md p-2 ${action.iconClass}`} />
                  <div className="ml-3 flex flex-col items-start">
                    <p className={`text-md ${action.textClass ?? ''}`}>{action.label}</p>
                    <p className="text-xs text-on-surface-variant">{action.description}</p>
                  </div>
                </div>
                <ChevronRight className={action.chevronClass ?? ''} />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

