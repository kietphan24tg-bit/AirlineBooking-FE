import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Card from '../ui/Card';

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  activeTab?: 'login' | 'register';
  /** When false, hides the Đăng Nhập / Đăng Ký tabs (e.g. password reset). */
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
  return (
    <main className="flex min-h-screen overflow-hidden bg-surface text-on-surface">
      <section className="relative hidden w-1/2 flex-shrink-0 items-center justify-center overflow-hidden bg-[#0d0d0d] lg:flex">
        <img
          alt="Khoang hạng nhất sang trọng"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCHxC89jqQSKau0zWFiynLmFqr8xr_9CHxJ6k4sKfTUKGPFJdqjNhmym2Dyx_qNg908_Dj2KAUBKv6Dsl_yYl1cX3W2Q0iUFcrLhgBrSlX5Y2joPDR5m8-sWfgFmohwkKvnhjBYFM9vHDaLhl6YeUARXTFHZESi31KFePC59txu_Wre6MtNwammZJ7VDp4Uoy4b82DIUER-FkmEKP5uoYEhYYraPjwPmWbqKt7CpRhcTbtiOyZv4hanmsVUClTCjafTeRxW6GVzVxJA"
          className="absolute inset-0 h-full w-full scale-105 object-cover opacity-75"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.88)_0%,rgba(0,0,0,0.1)_55%,transparent_100%)]" />
        <div className="relative z-10 max-w-[34rem] p-16">
          <p className="mb-8 font-headline text-[1.625rem] font-black uppercase tracking-[-0.03em] text-white">
            The Sovereign
          </p>
          <h2 className="mb-6 font-headline text-[clamp(2.25rem,3.5vw,3.25rem)] leading-[1.15] font-bold tracking-[-0.025em] text-white">
            Hành trình bắt đầu
            <br />
            từ sự riêng tư
            <br />
            tuyệt đối.
          </h2>
          <p className="max-w-[26rem] text-base leading-7 font-light text-white/60">
            Trải nghiệm dịch vụ hàng không đẳng cấp thế giới, nơi mỗi dặm bay là một chương mới của
            sự sang trọng và tiện nghi bậc nhất.
          </p>
          <div className="mt-12 flex items-center gap-4">
            <div className="h-px w-12 bg-secondary" />
            <span className="text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-secondary">
              Midnight Luxury
            </span>
          </div>
        </div>
      </section>

      <section
        className="relative flex flex-1 items-center justify-center overflow-y-auto px-6 py-12 md:px-16"
        style={{ backgroundImage: 'var(--texture-gold)' }}
      >
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 overflow-hidden opacity-[0.035]">
          <div className="absolute -right-1/2 -top-1/2 h-[200%] w-[200%] rotate-45 border-2 border-secondary" />
          <div className="absolute -right-[40%] -top-[40%] h-[200%] w-[200%] rotate-[40deg] border border-secondary" />
        </div>

        <Card className="relative z-10">
          <div className="mb-8">
            <h1 className="mb-2 font-headline text-3xl font-bold tracking-[-0.02em] text-on-surface">
              {title}
            </h1>
            <p className="text-[0.9375rem] font-light text-on-surface-variant">{subtitle}</p>
          </div>
          {showAuthTabs && (
            <div className="mb-8 flex gap-8 border-b border-[color:rgba(230,189,184,0.15)]">
              <Link
                to="/login"
                className={`mb-[-1px] border-b-2 pb-3 text-[0.6875rem] font-bold uppercase tracking-[0.12em] transition-colors ${
                  activeTab === 'login'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-on-surface-variant'
                }`}
              >
                Đăng Nhập
              </Link>
              <Link
                to="/register"
                className={`mb-[-1px] border-b-2 pb-3 text-[0.6875rem] font-bold uppercase tracking-[0.12em] transition-colors ${
                  activeTab === 'register'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-on-surface-variant'
                }`}
              >
                Đăng Ký
              </Link>
            </div>
          )}
          {children}
          <p className="mt-10 text-center text-[0.6875rem] leading-7 text-on-surface-variant/50">
            Bằng việc tiếp tục, bạn đồng ý với Điều khoản Dịch vụ và Chính sách Bảo mật của The
            Sovereign.
          </p>
        </Card>
      </section>
    </main>
  );
}
