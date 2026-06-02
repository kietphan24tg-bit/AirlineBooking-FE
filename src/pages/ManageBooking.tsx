import { ArrowRight, Ticket, User } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import BookingResultCard from '../components/booking/BookingResultCard';
import MarketingNav from '../components/layout/MarketingNav';
import SiteFooter from '../components/layout/SiteFooter';
import TextInput from '../components/ui/TextInput';
import {
  bookingService,
  resetMockManageBookingVariant,
  resolveMockManageBookingVariant,
  resolveManageBookingRouteSeed,
} from '../services/booking.service';
import { useBookingStore } from '../stores/useBookingStore';

export default function ManageBooking() {
  const location = useLocation();
  const { id: routeBookingId } = useParams<{ id?: string }>();
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
  const routeParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const rawRoutePnrCode = routeParams.get('pnr') ?? '';
  const rawRouteLastName = routeParams.get('lastName') ?? '';
  const shouldAutoLoadMock = routeParams.get('mockManageBooking') === '1';
  const shouldResolveRouteSeed =
    routeBookingId != null || Boolean(rawRoutePnrCode || rawRouteLastName) || shouldAutoLoadMock;
  const routeSeed = useMemo(
    () =>
      shouldResolveRouteSeed
        ? resolveManageBookingRouteSeed(routeBookingId ?? null, rawRoutePnrCode)
        : null,
    [rawRoutePnrCode, routeBookingId, shouldResolveRouteSeed]
  );
  const routePnrCode = routeSeed?.pnrCode ?? rawRoutePnrCode;
  const routeLastName = routeSeed?.lastName ?? rawRouteLastName;
  const routeTargetBookingId = routeSeed?.bookingId ?? (routeBookingId ? Number(routeBookingId) : null);
  const hasDirectLookupSeed = routeTargetBookingId != null || Boolean(routePnrCode || routeLastName);

  function showErrorToast(message: string) {
    toast.error(message, {
      id: 'manage-booking-error',
    });
  }

  function resetSearchForm() {
    clearBooking();
    setPnr('');
    setName('');
    setShowResult(false);
    setSearching(false);
    setErrorMessage(null);
  }

  useEffect(() => {
    if (hasDirectLookupSeed) return;

    if (!shouldAutoLoadMock) {
      setMockManageBookingMode(false);
      resetSearchForm();
      return;
    }

    const mockVariant = resolveMockManageBookingVariant();
    if (!mockVariant) {
      setMockManageBookingMode(false);
      resetSearchForm();
      return;
    }

    setMockManageBookingMode(true);
    resetMockManageBookingVariant(mockVariant);
    clearBooking();

    if (autoSearchedRef.current) return;
    autoSearchedRef.current = true;

    const seededPnr = routeSeed?.pnrCode ?? 'ABC123';
    const seededLastName = routeSeed?.lastName ?? 'Nguyen';
    const seededBookingId = routeTargetBookingId ?? routeSeed?.bookingId ?? null;

    setPnr(seededPnr);
    setName(seededLastName);
    setSearching(true);
    setErrorMessage(null);

    void (async () => {
      try {
        const lookup = await bookingService.lookupBooking({
          pnrCode: seededPnr,
          lastName: seededLastName,
        });
        setLookupCriteria({ pnrCode: seededPnr, lastName: seededLastName });
        setBookingLookup(lookup);
        const options = await bookingService.getManageOptions(seededBookingId ?? lookup.booking.bookingId);
        setManageOptions(options);
        setShowResult(true);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to load the sample booking data.';
        setErrorMessage(message);
        showErrorToast(message);
      } finally {
        setSearching(false);
      }
    })();
  }, [
    clearBooking,
    hasDirectLookupSeed,
    routeSeed?.bookingId,
    routeSeed?.lastName,
    routeSeed?.pnrCode,
    routeTargetBookingId,
    shouldAutoLoadMock,
    setBookingLookup,
    setLookupCriteria,
    setManageOptions,
    setMockManageBookingMode,
  ]);

  useEffect(() => {
    if (autoSearchedRef.current) return;
    if (!routePnrCode || !routeLastName) {
      if (routeTargetBookingId != null) {
        const message =
          'Missing PNR or last name in the URL. Open this booking from My Trips or search manually.';
        setErrorMessage(message);
        showErrorToast(message);
      }
      return;
    }
    const pnrCode = routePnrCode;
    const lastName = routeLastName;
    const bookingId = routeTargetBookingId;

    autoSearchedRef.current = true;
    setPnr(pnrCode);
    setName(lastName);
    setSearching(true);
    setErrorMessage(null);

    void (async () => {
      try {
        const lookup = await bookingService.lookupBooking({
          pnrCode,
          lastName,
        });
        setLookupCriteria({
          pnrCode,
          lastName,
        });
        setBookingLookup(lookup);
        const options = await bookingService.getManageOptions(
          bookingId ?? lookup.booking.bookingId
        );
        setManageOptions(options);
        setShowResult(true);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to load booking information.';
        setErrorMessage(message);
        showErrorToast(message);
      } finally {
        setSearching(false);
      }
    })();
  }, [
    routeLastName,
    routePnrCode,
    routeTargetBookingId,
    setBookingLookup,
    setLookupCriteria,
    setManageOptions,
  ]);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const pnrTrimmed = pnr.trim();
    const nameTrimmed = name.trim();
    if (!pnrTrimmed || !nameTrimmed) {
      showErrorToast('Please enter the booking reference (PNR) and the passenger last name.');
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
      try {
        const options = await bookingService.getManageOptions(lookup.booking.bookingId);
        setManageOptions(options);
      } catch (error) {
        setManageOptions(null);
        showErrorToast(
          error instanceof Error
            ? error.message
            : 'Unable to load booking actions right now. Please try again.'
        );
      }
      setShowResult(true);
    } catch (error) {
      setManageOptions(null);
      setShowResult(false);
      const message =
        error instanceof Error ? error.message : 'Booking information could not be found.';
      setErrorMessage(message);
      showErrorToast(message);
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
              Manage Booking
            </h1>
            <p className="mb-5 text-on-surface-variant">
              Enter the details exactly as shown on the travel document for a smoother check-in.
            </p>
          </div>
          {showResult ? (
            <button
              onClick={resetSearchForm}
              className="flex h-full w-50 items-center justify-center gap-2 rounded-lg bg-midnight-burgundy py-4 font-headline font-bold text-luxury-gold transition-all hover:brightness-110 active:scale-95"
            >
              Search another booking
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
                  BOOKING REFERENCE (PNR)
                </label>
                <div className="flex items-center gap-2">
                  <Ticket className="h-5 w-5 shrink-0 text-midnight-burgundy" strokeWidth={1.75} />
                  <TextInput
                    id="pnr"
                    name="pnr"
                    type="text"
                    placeholder="Enter booking reference"
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
                  LAST NAME (ON DOCUMENT)
                </label>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 shrink-0 text-midnight-burgundy" strokeWidth={1.75} />
                  <TextInput
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Enter passenger last name"
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
                {searching ? 'SEARCHING...' : 'FIND BOOKING'}
                <ArrowRight className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
          </form>
        ) : (
          <BookingResultCard />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
