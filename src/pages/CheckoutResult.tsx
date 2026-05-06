import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Home, RefreshCcw, Ticket, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import AmbientSweep from '../components/layout/AmbientSweep';
import SiteHeader from '../components/layout/SiteHeader';
import SiteFooter from '../components/layout/SiteFooter';
import Button from '../components/ui/Button';
import { useBookingStore } from '../stores/useBookingStore';
import { flightService } from '../services/flight.service';
import { TicketCard } from '../components/booking/TicketCard';

export default function CheckoutResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const bookingResponse = useBookingStore((state) => state.bookingResponse);

  // Xác định trạng thái từ URL parameters (ví dụ: ?status=success hoặc ?status=failed)
  const status = searchParams.get('status');
  const isSuccess =
    status === 'success' || status === 'completed' || searchParams.get('success') === 'true';
  const isFailed =
    status === 'failed' ||
    status === 'cancel' ||
    status === 'canceled' ||
    searchParams.get('success') === 'false';

  // Mặc định hiển thị thành công nếu không rõ
  const showSuccess = isSuccess || (!isSuccess && !isFailed);

  // Lấy dữ liệu seat map để map seatId sang seatNumber
  const flightId = bookingResponse?.flightId;
  const fareId = bookingResponse?.fareId;
  const seatMapQuery = useQuery({
    queryKey: ['seat-map', flightId, fareId],
    queryFn: () => flightService.getSeatMap(flightId as number, fareId as number),
    enabled: !!flightId && !!fareId && showSuccess, // Chỉ fetch khi cần hiển thị thành công
    staleTime: 60_000,
  });

  const getSeatNumber = (seatId: number) => {
    if (!seatMapQuery.data?.rows) return null;
    for (const row of seatMapQuery.data.rows) {
      const seat = row.cells.find((c) => c.seatId === seatId);
      if (seat) return seat.seatNumber;
    }
    return null;
  };

  // Format tiền tệ
  const currency = bookingResponse?.pricing?.currency || 'VND';
  const formatCurrency = (amount?: number) => {
    if (amount == null) return '';
    try {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency,
        maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
      }).format(amount);
    } catch {
      return `${amount} ${currency}`;
    }
  };

  const passengers = bookingResponse?.passengers || [];
  const assignments = bookingResponse?.lastSeatAssignment?.assignments || [];

  // Thông tin chuyến bay từ raw response
  const rawFlight = bookingResponse?.raw?.flight as Record<string, unknown> | undefined;
  const airline =
    ((rawFlight?.airline as Record<string, unknown>)?.name as string | undefined) ??
    ((rawFlight?.airline as Record<string, unknown>)?.airlineName as string | undefined);
  const flightNumber = rawFlight?.flightNumber as string | undefined;
  const flightDate = rawFlight?.flightDate as string | undefined;
  const departure = rawFlight?.departure as Record<string, unknown> | undefined;
  const arrival = rawFlight?.arrival as Record<string, unknown> | undefined;
  const fromCity = (departure?.cityName ?? departure?.airportCode ?? departure?.iataCode) as
    | string
    | undefined;
  const toCity = (arrival?.cityName ?? arrival?.airportCode ?? arrival?.iataCode) as
    | string
    | undefined;

  // Format ngày/giờ
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return undefined;
    try {
      return new Date(dateStr).toLocaleDateString('vi-VN');
    } catch {
      return dateStr;
    }
  };
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return undefined;
    try {
      return new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return undefined;
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-surface font-body text-on-surface antialiased">
      <AmbientSweep />
      <SiteHeader />

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-24">
        <div className="w-full max-w-250">
          {showSuccess ? (
            // Trạng thái Thành công
            <div className="rounded-3xl border border-luxury-gold/20 bg-white/90 p-10 shadow-2xl backdrop-blur-sm text-center">
              <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 shadow-inner">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" strokeWidth={2.5} />
              </div>
              <h1 className="mb-2 font-headline text-3xl font-black text-on-surface md:text-4xl">
                Thanh toán thành công!
              </h1>
              <p className="mb-2 text-sm text-on-surface-variant">
                Cảm ơn bạn đã lựa chọn dịch vụ của chúng tôi. Vé của bạn đã được xác nhận và thông
                tin chi tiết đã được gửi đến email.
              </p>

              {bookingResponse && (
                <div className="mb-8 space-y-4">
                  {/* Khối thông tin chung */}
                  <div className="rounded-2xl bg-surface-container-lowest p-6 text-left border border-outline-variant/30 shadow-sm">
                    <h3 className="mb-4 font-headline text-lg font-bold text-on-surface flex items-center gap-2">
                      <FileText className="h-5 w-5 text-midnight-burgundy" />
                      Thông tin đặt vé
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-on-surface-variant">Mã đặt chỗ (PNR)</p>
                        <p className="font-mono text-xl font-bold text-midnight-burgundy tracking-wider">
                          {bookingResponse.bookingCode || 'Đang cập nhật'}
                        </p>
                      </div>
                      {bookingResponse.pricing?.discountedTotalPrice != null && (
                        <div className="space-y-1 md:text-right">
                          <p className="text-sm text-on-surface-variant">Tổng thanh toán</p>
                          <p className="text-xl font-bold text-emerald-600">
                            {formatCurrency(bookingResponse.pricing.discountedTotalPrice)}
                          </p>
                        </div>
                      )}
                    </div>

                    <h3 className="mb-4 mt-4 font-headline text-lg font-bold text-on-surface flex items-center gap-2">
                      <Ticket className="h-5 w-5 text-midnight-burgundy" />
                      Thông tin vé
                    </h3>
                    <div className="w-full flex flex-col gap-4">
                      {passengers.length > 0 ? (
                        passengers.map((passenger, idx) => {
                          const passengerId = passenger.passengerId ?? passenger.id;
                          const assignment = assignments.find((a) => a.passengerId === passengerId);
                          const seatNumber = assignment
                            ? (getSeatNumber(assignment.seatId) ?? undefined)
                            : undefined;
                          const fullName = `${passenger.firstName} ${passenger.lastName}`.trim();
                          return (
                            <TicketCard
                              key={passengerId ?? idx}
                              passengerName={fullName}
                              from={fromCity}
                              to={toCity}
                              airline={airline}
                              flightNumber={flightNumber}
                              date={formatDate(flightDate)}
                              time={formatTime(flightDate)}
                              seat={seatNumber}
                              bookingCode={bookingResponse?.bookingCode ?? undefined}
                            />
                          );
                        })
                      ) : (
                        <TicketCard
                          passengerName="Hành khách"
                          from={fromCity}
                          to={toCity}
                          airline={airline}
                          flightNumber={flightNumber}
                          date={formatDate(flightDate)}
                          time={formatTime(flightDate)}
                          bookingCode={bookingResponse?.bookingCode ?? undefined}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Link
                  to="/trips"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-outline-variant/30 px-6 py-3 text-center text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
                >
                  <Ticket className="h-4 w-4" />
                  Xem chuyến đi của tôi
                </Link>
                <Button
                  type="button"
                  onClick={() => navigate('/home', { replace: true })}
                  icon={<Home className="h-4 w-4" strokeWidth={2} />}
                >
                  Về trang chủ
                </Button>
              </div>
            </div>
          ) : (
            // Trạng thái Thất bại
            <div className="rounded-3xl border border-cabin-burgundy/20 bg-white/90 p-10 shadow-2xl backdrop-blur-sm text-center">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-50 shadow-inner">
                <XCircle className="h-12 w-12 text-cabin-burgundy" strokeWidth={2.5} />
              </div>
              <h1 className="mb-4 font-headline text-3xl font-black text-on-surface md:text-4xl">
                Thanh toán không thành công
              </h1>
              <p className="mb-8 text-lg text-on-surface-variant">
                Rất tiếc, đã có lỗi xảy ra trong quá trình thanh toán hoặc giao dịch đã bị hủy. Vui
                lòng kiểm tra lại thông tin và thử lại.
              </p>

              {bookingResponse && (
                <div className="mb-8 rounded-2xl bg-surface-container-lowest p-6 text-left border border-outline-variant/30 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-on-surface-variant">Mã đặt chỗ (PNR)</p>
                      <p className="font-mono text-lg font-bold text-on-surface">
                        {bookingResponse.bookingCode || 'Đang cập nhật'}
                      </p>
                    </div>
                    {bookingResponse.pricing?.discountedTotalPrice != null && (
                      <div className="text-right">
                        <p className="text-sm text-on-surface-variant">Số tiền cần thanh toán</p>
                        <p className="text-lg font-bold text-on-surface">
                          {formatCurrency(bookingResponse.pricing.discountedTotalPrice)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Button
                  type="button"
                  onClick={() => navigate(-1)}
                  icon={<RefreshCcw className="h-4 w-4" strokeWidth={2} />}
                >
                  Thử lại thanh toán
                </Button>
                <Button
                  type="button"
                  onClick={() => navigate('/home', { replace: true })}
                  icon={<Home className="h-4 w-4" strokeWidth={2} />}
                >
                  Về trang chủ
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
