import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { PlaneTakeoff } from 'lucide-react';
import { Link } from 'react-router-dom';

const HERO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCHxC89jqQSKau0zWFiynLmFqr8xr_9CHxJ6k4sKfTUKGPFJdqjNhmym2Dyx_qNg908_Dj2KAUBKv6Dsl_yYl1cX3W2Q0iUFcrLhgBrSlX5Y2joPDR5m8-sWfgFmohwkKvnhjBYFM9vHDaLhl6YeUARXTFHZESi31KFePC59txu_Wre6MtNwammZJ7VDp4Uoy4b82DIUER-FkmEKP5uoYEhYYraPjwPmWbqKt7CpRhcTbtiOyZv4hanmsVUClTCjafTeRxW6GVzVxJA';

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  activeTab?: 'login' | 'register';
  /** When false, hides the Sign In / Sign Up tabs (e.g. password reset). */
  showAuthTabs?: boolean;
  children: ReactNode;
};

export default function AuthLayout({
  title,
  subtitle,
  activeTab = 'login',
  showAuthTabs = true,
  children,
}: AuthLayoutProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <main className="fixed inset-0 z-0 flex h-[100dvh] min-h-[100dvh] overflow-hidden bg-surface text-on-surface">
      {/* Left: visual narrative (stitch_plane ng_nh_p_ng_k) */}
      <section className="relative hidden h-full min-h-0 w-1/2 shrink-0 items-center justify-center overflow-hidden bg-stone-900 md:flex">
        <div className="absolute inset-0 z-0">
          <img
            alt="Luxury first-class cabin"
            src={HERO_IMAGE}
            className="h-full w-full scale-105 object-cover opacity-80 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </div>
        <div className="relative z-10 max-w-xl p-8 lg:p-16">
          <div className="mb-8">
            <span className="font-headline text-2xl font-black uppercase tracking-tighter text-white lg:text-3xl">
              The Sovereign
            </span>
          </div>
          <h2 className="mb-6 font-headline text-4xl font-bold leading-tight text-white lg:text-5xl">
            A journey that begins <br />
            with absolute privacy.
          </h2>
          <p className="max-w-md text-lg font-light leading-relaxed text-white/70">
            Experience world-class aviation where every mile opens a new chapter of luxury and
            uncompromising comfort.
          </p>
          <div className="mt-12 flex items-center gap-4">
            <div className="h-px w-12 bg-secondary" />
            <span className="font-label text-xs font-bold uppercase tracking-[0.2em] text-secondary">
              Midnight Luxury
            </span>
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-12 right-12 z-10 opacity-20">
          <PlaneTakeoff aria-hidden className="h-28 w-28 text-white" strokeWidth={1} />
        </div>
      </section>

      {/* Right: form */}
      <section className="gold-line-pattern relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden md:w-1/2">
        <div className="relative flex h-full min-h-0 flex-col overflow-y-auto px-6 py-12 md:px-12 lg:px-24">
          <div className="absolute top-8 left-8 md:hidden">
            <span className="font-headline text-xl font-black tracking-tight text-primary">
              The Sovereign
            </span>
          </div>
          <div className="pointer-events-none absolute top-0 right-0 h-64 w-64 overflow-hidden opacity-[0.03]">
            <div className="absolute -top-1/2 -right-1/2 h-[200%] w-[200%] origin-center rotate-45 border-2 border-secondary" />
            <div className="absolute -top-[40%] -right-[40%] h-[200%] w-[200%] origin-center rotate-[40deg] border border-secondary" />
          </div>

          <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center pt-16 pb-8 md:py-12">
            <div className="space-y-8">
              <div className="space-y-2">
                <h1 className="font-headline text-3xl font-bold tracking-tight text-on-surface">
                  {title}
                </h1>
                <p className="font-light text-on-surface-variant">{subtitle}</p>
              </div>

              {showAuthTabs ? (
                <div className="flex gap-8 border-b border-outline-variant/20">
                  <Link
                    to="/login"
                    className={`pb-4 text-sm font-bold uppercase tracking-widest transition-colors ${
                      activeTab === 'login'
                        ? 'border-b-2 border-primary text-primary'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className={`pb-4 text-sm font-bold uppercase tracking-widest transition-colors ${
                      activeTab === 'register'
                        ? 'border-b-2 border-primary text-primary'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Sign Up
                  </Link>
                </div>
              ) : null}

              {children}

              <p className="pt-4 text-center text-xs leading-relaxed text-on-surface-variant/60">
                By continuing, you agree to The Sovereign&apos;s{' '}
                <a className="underline hover:text-on-surface" href="/terms">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a className="underline hover:text-on-surface" href="/privacy">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
