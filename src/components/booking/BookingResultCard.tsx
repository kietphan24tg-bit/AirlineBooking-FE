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
        caption: 'Đặt chỗ đã được xác nhận và thanh toán',
      };
    case 'CHECKED_IN':
      return {
        textClass: 'text-emerald-700',
        iconBgClass: 'bg-emerald-600',
        showSuccessIcon: true,
        caption: 'Hành khách đã hoàn tất check-in trực tuyến',
      };
    case 'CANCELLED':
      return {
        textClass: 'text-red-600',
        iconBgClass: 'bg-red-500',
        showSuccessIcon: false,
        caption: 'Đặt chỗ đã bị hủy. Vui lòng liên hệ tổng đài nếu cần hoàn tiền.',
      };
    case 'PENDING_PAYMENT':
    case 'PENDING':
      return {
        textClass: 'text-amber-600',
        iconBgClass: 'bg-amber-500',
        showSuccessIcon: false,
        caption: 'Đặt chỗ đang chờ thanh toán. Hoàn tất trước khi hết thời gian giữ chỗ.',
      };
    default:
      return {
        textClass: 'text-on-surface',
        iconBgClass: 'bg-surface-container-high',
        showSuccessIcon: false,
        caption: 'Trạng thái đặt chỗ',
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
      label: 'Check-in trực tuyến',
      description: 'Làm thủ tục trực tuyến và nhận thẻ lên máy bay',
      icon: SquareCheckBig,
      iconClass: 'bg-midnight-burgundy stroke-luxury-gold',
      onClick: () => navigate('/manage-booking/check-in'),
    },
    {
      key: 'ancillaries',
      enabled: actions.canBuyAncillaries || Boolean(actions.canBuyAancillaries),
      label: 'Mua thêm tiện ích',
      description: 'Hành lý, suất ăn',
      icon: PlaneTakeoff,
      iconClass: 'bg-midnight-burgundy stroke-luxury-gold',
      onClick: () => navigate('/manage-booking/add-services'),
    },
    {
      key: 'seat',
      enabled: actions.canSelectSeat,
      label: 'Chọn chỗ ngồi',
      description: 'Lựa chọn chỗ ngồi thoải mái cho chuyến đi',
      icon: Armchair,
      iconClass: 'bg-midnight-burgundy stroke-luxury-gold',
      onClick: () => navigate('/manage-booking/seat-selection'),
    },
    {
      key: 'change-flight',
      enabled: actions.canChangeFlight,
      label: 'Thay đổi chuyến bay',
      description: 'Thay đổi ngày giờ hoặc hành trình',
      icon: PlaneTakeoff,
      iconClass: 'bg-midnight-burgundy stroke-luxury-gold',
      onClick: () => navigate('/manage-booking/change-flight'),
    },
    {
      key: 'cancel',
      enabled: actions.canCancel,
      label: 'Hủy chuyến bay',
      description: 'Hủy chuyến và yêu cầu hoàn tiền',
      icon: CircleX,
      iconClass: 'bg-red-100 stroke-red-600',
      borderHoverClass: 'hover:border-red-600',
      textClass: 'text-red-600',
      chevronClass: 'text-red-600',
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
        : 'Dịch vụ'
  );

  return (
    <div className="rounded-2xl border border-[#eadfd7] bg-gradient-to-br from-white via-white to-[#fcf7f3] px-5 py-5 shadow-[0_18px_40px_-32px_rgba(92,14,42,0.45)] sm:px-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold tracking-[0.16em] text-midnight-burgundy/45">
                {String(index).padStart(2, '0')}
              </span>
              <h3 className="text-lg font-black uppercase tracking-[0.06em] text-on-surface">
                {fullName}
              </h3>
            </div>
            <p className="mt-2 text-sm text-on-surface-variant">
              {formatPassengerType(passenger.passengerType)} • {passenger.dateOfBirth}
            </p>
          </div>

          <span className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            Đã xác nhận
          </span>
        </div>

        <div className="grid gap-3 text-sm text-on-surface sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-xl bg-[#f8f1ea] px-3 py-2.5">
            <Mail className="h-4 w-4 shrink-0 text-midnight-burgundy/70" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-midnight-burgundy/50">
                Email
              </p>
              <p className="truncate font-medium">{email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-[#f8f1ea] px-3 py-2.5">
            <Phone className="h-4 w-4 shrink-0 text-midnight-burgundy/70" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-midnight-burgundy/50">
                SĐT
              </p>
              <p className="truncate font-medium">{phone}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {seats.length > 0 ? (
            <span className="inline-flex rounded-full border border-[#e7c88c] bg-[#fff4d9] px-3 py-1.5 text-sm font-semibold text-[#7a5418]">
              Ghế {seats.map((seat) => seat.seatNumber).join(', ')}
            </span>
          ) : null}

          <span className="inline-flex rounded-full border border-[#efd9d1] bg-[#fbf2ed] px-3 py-1.5 text-sm font-semibold text-midnight-burgundy">
            {carryOnWeight}kg miễn cước
          </span>

          {serviceLabels.map((label) => (
            <span
              key={`${passenger.passengerId}-${label}`}
              className="inline-flex rounded-full border border-[#e5dce8] bg-[#f7f1fb] px-3 py-1.5 text-sm font-semibold text-[#5b3b74]"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
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
                Trạng thái đặt chỗ
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
                      <Clock className="h-3 w-3" /> Hết hạn: {booking.expiresAt}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Mã đặt chỗ (PNR)
              </p>
              <h1 className="mt-1 text-lg font-bold text-on-surface">{booking.pnrCode}</h1>
            </div>

            <div
              className="relative flex cursor-pointer flex-col"
              onClick={() => setShowPriceDetail(!showPriceDetail)}
            >
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Tổng tiền
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
                      <span className="text-on-surface-variant">Giá vé cơ bản:</span>
                      <span className="font-medium">
                        {formatMoney(price.baseFare, price.currency)}
                      </span>
                    </div>
                    {price.discount !== 0 ? (
                      <div className="flex justify-between text-green-600">
                        <span>Giảm giá:</span>
                        <span className="font-medium">
                          {formatMoney(price.discount, price.currency)}
                        </span>
                      </div>
                    ) : null}
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Thuế:</span>
                      <span className="font-medium">{formatMoney(price.tax, price.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Phí dịch vụ:</span>
                      <span className="font-medium">
                        {formatMoney(price.serviceFee, price.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Phí chọn chỗ:</span>
                      <span className="font-medium">
                        {formatMoney(price.seatFee, price.currency)}
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between border-t border-gray-100 pt-2">
                      <span className="text-base font-bold">Tổng cộng:</span>
                      <span className="text-base font-bold text-midnight-burgundy">
                        {formatMoney(price.total, price.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-col rounded-xl bg-white p-7">
          <p className="text-sm font-bold text-on-surface-variant">Thông tin chuyến bay</p>
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
                    {isReturn ? 'Chuyến về' : 'Chuyến đi'}
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
                  <p>Hạng vé: {itin.fareName}</p>
                  <p>Tình trạng: {itin.flightStatus}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col rounded-xl bg-white p-7">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-on-surface-variant">
            Danh sách hành khách
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
        <p className="mb-4 text-xl font-bold">Quản lý đặt chỗ</p>

        {enabledManageActions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-on-surface-variant">
            Hiện không có thao tác nào khả dụng cho trạng thái{' '}
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
