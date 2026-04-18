import { ArrowRight, Ticket, User } from 'lucide-react';
import BookingResultCard from '../components/booking/BookingResultCard';
import MarketingNav from '../components/layout/MarketingNav';
import SiteFooter from '../components/layout/SiteFooter';
import TextInput from '../components/ui/TextInput';
import { TripRecord, PassengerProfile } from '../types/booking.types';
import { useState } from 'react';

const passenger: PassengerProfile = {
  id: 'p1',
  fullName: 'John Doe',
  seat: '12A',
};

const mytrip: TripRecord = {
  id: 'ABC123 ',
  route: 'London (LHR) to Dubai (DXB)',
  dateLabel: '12 Oct 2024',
  status: 'completed',
  cabin: 'Business',
};

export default function ManageBooking() {
  const [pnr, setPnr] = useState('');
  const [name, setName] = useState('');
  const [showResult, setShowResult] = useState(false);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const pnrTrimmed = pnr.trim();
    const nameTrimmed = name.trim();
    if (!pnrTrimmed || !nameTrimmed) {
      alert('Please enter your booking code (PNR) and full name.');
      return;
    }
    setShowResult(true);
  };
  return (
    <div className="relative min-h-screen bg-surface text-on-surface antialiased">
      <MarketingNav active="manage" />
      <main className="flex flex-col justify-start mx-auto mt-30 w-full max-w-200 min-h-svh px-6 md:px-8">
        <h1 className="mb-2 font-headline text-3xl font-black text-on-surface md:text-5xl">
          Manage Your Booking
        </h1>
        <p className="mb-5 text-on-surface-variant">
          Nhập thông tin chính xác theo giấy tờ tùy thân để làm thủ tục suôn sẻ.
        </p>
        <form
          onSubmit={onSearch}
          className="glass-panel max-w-400 rounded-xl border border-luxury-gold/20 p-1 shadow-2xl mb-10"
        >
          {/* Search Form Grid */}
          <div className="grid gap-1 p-4 md:grid-cols-2">
            {/* PNR */}
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

            {/* Name */}
            <div className="space-y-1 p-4">
              <label
                htmlFor="name"
                className="font-label block text-[0.6875rem] font-bold uppercase tracking-widest text-midnight-burgundy/60"
              >
                Full name (as on ID)
              </label>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 shrink-0 text-midnight-burgundy" strokeWidth={1.75} />
                <TextInput
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="w-full border-none bg-transparent p-0 font-headline text-lg font-bold text-midnight-burgundy focus:ring-0"
                />
              </div>
            </div>
          </div>
          {/* Search Button */}
          <div className="flex items-center p-2 md:p-1">
            <button
              type="submit"
              className="flex h-full w-full items-center justify-center gap-2 rounded-lg bg-midnight-burgundy py-4 font-headline font-bold text-luxury-gold transition-all hover:brightness-110 active:scale-95"
            >
              SEARCH FLIGHTS
              <ArrowRight className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        </form>
        {showResult && <BookingResultCard trip={mytrip} passenger={passenger} />}
      </main>
      <SiteFooter />
    </div>
  );
}
