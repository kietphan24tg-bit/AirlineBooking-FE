import { ArrowRight, Ticket, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import BookingResultCard from '../components/booking/BookingResultCard';
import MarketingNav from '../components/layout/MarketingNav';
import SiteFooter from '../components/layout/SiteFooter';
import TextInput from '../components/ui/TextInput';
import {
  bookingService,
  resetMockManageBookingVariant,
  resolveMockManageBookingVariant,
} from '../services/booking.service';
import { useBookingStore } from '../stores/useBookingStore';

export default function ManageBooking() {
  const [pnr, setPnr] = useState('');
  const [name, setName] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [searching, setSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const setBookingLookup = useBookingStore((state) => state.setBookingLookup);
  const setLookupCriteria = useBookingStore((state) => state.setLookupCriteria);
  const setManageOptions = useBookingStore((state) => state.setManageOptions);
  const setMockManageBookingMode = useBookingStore((state) => state.setMockManageBookingMode);
  const clearBooking = useBookingStore((state) => state.clearBooking);

  const autoSearchedRef = useRef(false);

  useEffect(() => {
    const mockVariant = resolveMockManageBookingVariant();
    if (!mockVariant) {
      setMockManageBookingMode(false);
      return;
    }

    setMockManageBookingMode(true);
    resetMockManageBookingVariant(mockVariant);
    // Drop any stale persisted lookup/manage data so the mock variant fully owns the screen.
    clearBooking();

    if (autoSearchedRef.current) return;
    autoSearchedRef.current = true;

    setPnr('ABC123');
    setName('Nguyen');
    setSearching(true);
    setErrorMessage(null);

    void (async () => {
      try {
        const lookup = await bookingService.lookupBooking({
          pnrCode: 'ABC123',
          lastName: 'Nguyen',
        });
        setLookupCriteria({ pnrCode: 'ABC123', lastName: 'Nguyen' });
        setBookingLookup(lookup);
        const options = await bookingService.getManageOptions(lookup.booking.bookingId);
        setManageOptions(options);
        setShowResult(true);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'Khong the tai du lieu mock booking.'
        );
      } finally {
        setSearching(false);
      }
    })();
  }, [clearBooking, setBookingLookup, setLookupCriteria, setManageOptions, setMockManageBookingMode]);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const pnrTrimmed = pnr.trim();
    const nameTrimmed = name.trim();
    if (!pnrTrimmed || !nameTrimmed) {
      alert('Please enter your booking code (PNR) and full name.');
      return;
    }

    setSearching(true);
    setErrorMessage(null);
    setManageOptions(null);

    try {
      setLookupCriteria({
        pnrCode: pnrTrimmed,
        lastName: nameTrimmed,
      });
      const lookup = await bookingService.lookupBooking({
        pnrCode: pnrTrimmed,
        lastName: nameTrimmed,
      });
      setBookingLookup(lookup);
      // Manage-options is a non-blocking enrichment; the overview still renders if it fails.
      try {
        const options = await bookingService.getManageOptions(lookup.booking.bookingId);
        setManageOptions(options);
      } catch {
        setManageOptions(null);
      }
      setShowResult(true);
    } catch (error) {
      setManageOptions(null);
      setShowResult(false);
      setErrorMessage(
        error instanceof Error ? error.message : 'Khong tim thay thong tin dat cho.'
      );
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-surface text-on-surface antialiased">
      <MarketingNav active="manage" />
      <main className="mx-auto mt-30 flex min-h-svh w-full max-w-400 flex-col justify-start px-6 md:px-8">
        <div className="flex flex-row items-center justify-between">
          <div>
            <h1 className="mb-2 font-headline text-3xl font-black text-on-surface md:text-5xl">
              Manage Your Booking
            </h1>
            <p className="mb-5 text-on-surface-variant">
              Nhap thong tin chinh xac theo giay to tuy than de lam thu tuc suon se.
            </p>
          </div>
          {showResult ? (
            <button
              onClick={() => setShowResult(false)}
              className="flex h-full w-50 items-center justify-center gap-2 rounded-lg bg-midnight-burgundy py-4 font-headline font-bold text-luxury-gold transition-all hover:brightness-110 active:scale-95"
            >
              Tim kiem dat cho moi
            </button>
          ) : null}
        </div>

        {!showResult ? (
          <form
            onSubmit={onSearch}
            className="glass-panel mb-10 w-full rounded-xl border border-luxury-gold/20 px-4 py-3 shadow-2xl"
          >
            <div className="grid gap-1 p-4 md:grid-cols-2">
              <div className="space-y-1 p-4">
                <label
                  htmlFor="pnr"
                  className="font-label block text-[0.6875rem] font-bold uppercase tracking-widest text-midnight-burgundy/60"
                >
                  BOOKING CODE (PNR)
                </label>
                <div className="flex items-center gap-2">
                  <Ticket className="h-5 w-5 shrink-0 text-midnight-burgundy" strokeWidth={1.75} />
                  <TextInput
                    id="pnr"
                    name="pnr"
                    type="text"
                    placeholder="Enter your booking code"
                    value={pnr}
                    onChange={(e) => setPnr(e.target.value)}
                    autoComplete="off"
                    className="w-full border-none bg-transparent p-0 font-headline text-lg font-bold text-midnight-burgundy focus:ring-0"
                  />
                </div>
              </div>

              <div className="space-y-1 p-4">
                <label
                  htmlFor="name"
                  className="font-label block text-[0.6875rem] font-bold uppercase tracking-widest text-midnight-burgundy/60"
                >
                  Last name (as on ID)
                </label>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 shrink-0 text-midnight-burgundy" strokeWidth={1.75} />
                  <TextInput
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Enter your last name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className="w-full border-none bg-transparent p-0 font-headline text-lg font-bold text-midnight-burgundy focus:ring-0"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center p-2 md:p-1">
              <button
                type="submit"
                disabled={searching}
                className="flex h-full w-full items-center justify-center gap-2 rounded-lg bg-midnight-burgundy py-4 font-headline font-bold text-luxury-gold transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {searching ? 'SEARCHING...' : 'SEARCH FLIGHTS'}
                <ArrowRight className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
            {errorMessage ? (
              <p className="px-6 pb-3 text-sm font-medium text-red-600">{errorMessage}</p>
            ) : null}
          </form>
        ) : (
          <BookingResultCard />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
