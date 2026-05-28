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
  iconClass: string;
  pillClass: string;
  showSuccessIcon: boolean;
  caption: string;
}

function resolveStatusDisplay(status: string): StatusDisplay {
  const normalized = (status ?? '').toUpperCase();

  switch (normalized) {
    case 'CONFIRMED':
    case 'COMPLETED':
      return {
        textClass: 'text-emerald-700',
        iconBgClass: 'bg-emerald-500/18',
        iconClass: 'text-emerald-700',
        pillClass: 'border-emerald-200/80 bg-emerald-50 text-emerald-700',
        showSuccessIcon: true,
        caption: 'This booking has been confirmed and paid.',
      };
    case 'CHECKED_IN':
      return {
        textClass: 'text-emerald-700',
        iconBgClass: 'bg-emerald-500/18',
        iconClass: 'text-emerald-700',
        pillClass: 'border-emerald-200/80 bg-emerald-50 text-emerald-700',
        showSuccessIcon: true,
        caption: 'Passengers have completed online check-in.',
      };
    case 'CANCELLED':
      return {
        textClass: 'text-rose-700',
        iconBgClass: 'bg-rose-500/16',
        iconClass: 'text-rose-700',
        pillClass: 'border-rose-200/80 bg-rose-50 text-rose-700',
        showSuccessIcon: false,
        caption: 'This booking has been cancelled. Contact support if you need a refund.',
      };
    case 'PENDING_PAYMENT':
    case 'PENDING':
      return {
        textClass: 'text-amber-700',
        iconBgClass: 'bg-amber-500/18',
        iconClass: 'text-amber-700',
        pillClass: 'border-amber-200/80 bg-amber-50 text-amber-700',
        showSuccessIcon: false,
        caption: 'This booking is awaiting payment. Complete it before the hold expires.',
      };
    default:
      return {
        textClass: 'text-on-surface',
        iconBgClass: 'bg-midnight-burgundy/10',
        iconClass: 'text-midnight-burgundy',
        pillClass: 'border-luxury-gold/20 bg-surface-lowest text-on-surface',
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
    <article className="rounded-[28px] border border-luxury-gold/18 bg-white/96 px-5 py-5 shadow-[0_18px_44px_rgba(125,6,51,0.08)] sm:px-6">
      <div className="hidden" />
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-luxury-gold/15 bg-midnight-burgundy/6 px-3 text-xs font-bold tracking-[0.16em] text-midnight-burgundy">
                {String(index).padStart(2, '0')}
              </span>
              <div className="space-y-1">
                <h3 className="text-lg font-bold uppercase tracking-[0.02em] text-on-surface sm:text-[1.2rem]">
                  {fullName}
                </h3>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
              <span>{formatPassengerType(passenger.passengerType)}</span>
              <span className="h-1 w-1 rounded-full bg-luxury-gold/40" />
              <span>{passenger.dateOfBirth}</span>
            </div>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Confirmed
          </span>
        </div>

        <div className="grid gap-3 border-t border-luxury-gold/12 pt-4 text-sm text-on-surface sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-2xl border border-luxury-gold/12 bg-surface-lowest px-4 py-3">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-luxury-gold/12 bg-white text-midnight-burgundy">
              <Mail className="h-4 w-4 shrink-0" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-midnight-burgundy/55">
                Email
              </p>
              <p className="mt-1 truncate text-sm font-medium text-on-surface">{email}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-luxury-gold/12 bg-surface-lowest px-4 py-3">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-luxury-gold/12 bg-white text-midnight-burgundy">
              <Phone className="h-4 w-4 shrink-0" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-midnight-burgundy/55">
                Phone
              </p>
              <p className="mt-1 truncate text-sm font-medium text-on-surface">{phone}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {seats.length > 0 ? (
            <span className="inline-flex rounded-full border border-luxury-gold/18 bg-surface-lowest px-3 py-1.5 text-sm font-medium text-on-surface">
              Seat {seats.map((seat) => seat.seatNumber).join(', ')}
            </span>
          ) : null}

          <span className="inline-flex rounded-full border border-luxury-gold/18 bg-surface-lowest px-3 py-1.5 text-sm font-medium text-on-surface">
            {carryOnWeight}kg included
          </span>

          {serviceLabels.map((label) => (
            <span
              key={`${passenger.passengerId}-${label}`}
              className="inline-flex rounded-full border border-luxury-gold/18 bg-surface-lowest px-3 py-1.5 text-sm font-medium text-on-surface"
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
    <div className="grid gap-4 overflow-visible lg:grid-cols-[minmax(0,1fr)_308px]">
      <div className="flex flex-1 flex-col gap-5">
        <div className="glass-panel relative z-20 overflow-visible rounded-[28px] border border-luxury-gold/18 px-5 py-5 shadow-[0_18px_44px_rgba(125,6,51,0.08)]">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-[22px] border border-luxury-gold/12 bg-surface-lowest px-4 py-4">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-midnight-burgundy/65">
                Booking status
              </p>
              <div className="mt-1 flex items-center gap-2">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full ${status.iconBgClass}`}
                  >
                    <CheckCircle2 className={`h-4 w-4 ${status.iconClass}`} />
                  </div>
                <div className="flex flex-col">
                  <h1 className={`text-base font-bold ${status.textClass}`}>{booking.statusLabel}</h1>
                  <p className="mt-0.5 text-xs text-on-surface-variant">{status.caption}</p>
                  {booking.expiresAt ? (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-600">
                      <Clock className="h-3 w-3" /> Expires: {booking.expiresAt}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-[22px] border border-luxury-gold/12 bg-surface-lowest px-4 py-4">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-midnight-burgundy/65">
                Booking reference (PNR)
              </p>
              <h1 className="mt-1 font-headline text-[1.65rem] font-black tracking-[0.02em] text-on-surface">
                {booking.pnrCode}
              </h1>
            </div>

            <button
              type="button"
              className="relative flex cursor-pointer flex-col rounded-[22px] border border-luxury-gold/12 bg-surface-lowest px-4 py-4 text-left transition hover:border-luxury-gold/30"
              onClick={() => setShowPriceDetail(!showPriceDetail)}
            >
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-midnight-burgundy/65">
                Total amount
              </p>
              <div className="mt-1 flex items-center gap-1">
                <h1 className="font-headline text-[1.65rem] font-black text-midnight-burgundy">
                  {formatMoney(price.total, price.currency)}
                </h1>
                {showPriceDetail ? (
                  <ChevronUp className="h-4 w-4 text-midnight-burgundy" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-midnight-burgundy" />
                )}
              </div>

              {showPriceDetail ? (
                <div className="absolute right-0 top-full z-40 mt-3 flex w-68 animate-in flex-col rounded-[22px] border border-luxury-gold/16 bg-white p-4 text-sm shadow-[0_18px_44px_rgba(125,6,51,0.12)] fade-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Base fare:</span>
                      <span className="font-medium">
                        {formatMoney(price.baseFare, price.currency)}
                      </span>
                    </div>
                    {price.discount !== 0 ? (
                      <div className="flex justify-between text-emerald-700">
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
                    <div className="mt-2 flex justify-between border-t border-luxury-gold/12 pt-2">
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

        <div className="glass-panel rounded-[28px] border border-luxury-gold/18 px-5 py-5 shadow-[0_18px_44px_rgba(125,6,51,0.08)]">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="font-headline text-[1.5rem] font-black text-on-surface">
                Flight information
              </p>
              <p className="mt-1 text-sm text-on-surface-variant">
                Review outbound and return segments before choosing your next action.
              </p>
            </div>
            <span className="rounded-full border border-luxury-gold/18 bg-midnight-burgundy/6 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-midnight-burgundy">
              {itineraries.length} segment{itineraries.length > 1 ? 's' : ''}
            </span>
          </div>
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
              <div
                key={itin.flightId}
                className="mb-4 rounded-[24px] border border-luxury-gold/14 bg-white/90 px-4 py-4 shadow-[0_8px_22px_rgba(125,6,51,0.04)] last:mb-0"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
                  <div className="flex min-w-34 flex-col items-start justify-center">
                    <div className="flex items-center justify-center rounded-full border border-luxury-gold/20 bg-luxury-gold/18 px-3 py-1 text-xs font-semibold text-midnight-burgundy">
                    {isReturn ? 'Return' : 'Outbound'}
                    </div>
                    <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-midnight-burgundy/55">
                      Date
                    </p>
                    <p className="text-lg font-bold text-on-surface">{dateStr}</p>
                  </div>

                  <div className="flex flex-1 flex-col gap-4 rounded-[20px] border border-luxury-gold/10 bg-surface-lowest px-4 py-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex min-w-28 flex-col text-left">
                      <p className="text-[1.55rem] font-black text-on-surface">{depTime}</p>
                      <p className="text-base font-semibold text-on-surface">{itin.departureAirportCode}</p>
                      <p className="text-sm text-on-surface-variant">{itin.departureCity}</p>
                    </div>

                    <div className="flex flex-col items-center justify-center">
                      <p className="text-[13px] font-semibold text-midnight-burgundy">{itin.flightNumber}</p>
                      <div className="flex flex-row items-center justify-center">
                        <div className="w-16 border-t-2 border-dashed border-luxury-gold/50 sm:w-22" />
                        <Plane className="h-5 w-5 rotate-45 fill-luxury-gold stroke-midnight-burgundy" />
                        <div className="w-16 border-t-2 border-dashed border-luxury-gold/50 sm:w-22" />
                      </div>
                    </div>

                    <div className="flex min-w-28 flex-col text-left xl:text-right">
                      <p className="text-[1.55rem] font-black text-on-surface">{arrTime}</p>
                      <p className="text-base font-semibold text-on-surface">{itin.arrivalAirportCode}</p>
                      <p className="text-sm text-on-surface-variant">{itin.arrivalCity}</p>
                    </div>
                  </div>

                  <div className="grid min-w-38 gap-2 rounded-[20px] border border-luxury-gold/10 bg-surface-lowest px-4 py-4 text-sm text-on-surface">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-midnight-burgundy/55">
                        Fare
                      </p>
                      <p className="mt-1 font-semibold">{itin.fareName}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-midnight-burgundy/55">
                        Status
                      </p>
                      <p className="mt-1 font-semibold">{itin.flightStatus}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="glass-panel rounded-[28px] border border-luxury-gold/18 px-5 py-5 shadow-[0_18px_44px_rgba(125,6,51,0.08)]">
          <p className="mb-2 font-headline text-[1.5rem] font-black text-on-surface">
            Passenger list
          </p>
          <p className="mb-6 max-w-2xl text-sm leading-6 text-on-surface-variant">
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

      <div className="glass-panel flex h-fit w-full flex-col rounded-[28px] border border-luxury-gold/18 px-5 py-5 shadow-[0_18px_44px_rgba(125,6,51,0.08)]">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.24em] text-midnight-burgundy">
          Booking actions
        </p>
        <p className="mb-4 font-headline text-[1.55rem] font-black text-on-surface">
          Manage booking
        </p>

        {enabledManageActions.length === 0 ? (
          <p className="rounded-[24px] border border-dashed border-luxury-gold/24 bg-surface-lowest p-4 text-sm text-on-surface-variant">
            No actions are currently available for status{' '}
            <span className="font-semibold">{booking.statusLabel}</span>.
          </p>
        ) : (
          enabledManageActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.key}
                className={`mb-3 flex flex-row items-center justify-between rounded-[22px] border border-luxury-gold/16 bg-white/96 p-4 text-left shadow-[0_10px_24px_rgba(125,6,51,0.05)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-luxury-gold/28 hover:shadow-[0_18px_30px_rgba(125,6,51,0.1)] ${
                  action.borderHoverClass ?? ''
                }`}
                onClick={action.onClick}
              >
                <div className="flex flex-row items-center">
                  <div className="rounded-[16px] border border-luxury-gold/12 bg-midnight-burgundy/5 p-2">
                    <Icon className={`size-9 rounded-[11px] p-2 ${action.iconClass}`} />
                  </div>
                  <div className="ml-3 flex flex-col items-start">
                    <p className={`text-[15px] font-semibold text-on-surface ${action.textClass ?? ''}`}>
                      {action.label}
                    </p>
                    <p className="text-xs leading-5 text-on-surface-variant">{action.description}</p>
                  </div>
                </div>
                <ChevronRight className={`h-5 w-5 text-midnight-burgundy ${action.chevronClass ?? ''}`} />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
