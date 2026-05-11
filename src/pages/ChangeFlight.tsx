import { ArrowLeft, PlaneTakeoff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SiteFooter from '../components/layout/SiteFooter';
import SiteHeader from '../components/layout/SiteHeader';

/**
 * Placeholder route for the "Thay doi chuyen bay" CTA on `BookingResultCard`.
 *
 * The real flight-change flow is not implemented on the backend yet (see
 * follow-ups in chat). We render a friendly placeholder so the CTA does not
 * dead-end on a blank screen and the manage-booking variants can still be
 * exercised end-to-end via `?mockManageBooking=1`.
 */
export default function ChangeFlight() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-surface text-on-surface antialiased">
      <SiteHeader />
      <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col items-center justify-center gap-6 px-6 py-24 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <PlaneTakeoff className="h-10 w-10 text-primary" />
        </div>
        <div>
          <h1 className="font-headline text-3xl font-black text-on-surface md:text-4xl">
            Thay đổi chuyến bay
          </h1>
          <p className="mt-3 max-w-xl text-on-surface-variant">
            Tính năng đổi chuyến đang được hoàn thiện. Vui lòng liên hệ tổng đài 1900 1100 để được
            hỗ trợ thay đổi hành trình hiện tại.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/manage-booking')}
          className="inline-flex items-center gap-2 rounded-xl bg-midnight-burgundy px-6 py-3 font-headline text-sm font-bold text-luxury-gold shadow-lg transition-all hover:brightness-110 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại quản lý đặt chỗ
        </button>
      </main>
      <SiteFooter />
    </div>
  );
}
