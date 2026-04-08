import { Bell, Lock, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { useAuthStore } from '../stores/useAuthStore';
import FieldLabel from '../components/ui/FieldLabel';
import TextInput from '../components/ui/TextInput';

export default function AccountManagement() {
  const navigate = useNavigate();
  const signOut = useAuthStore((s) => s.signOut);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface">
      <header className="bg-primary shadow-md">
        <div className="mx-auto flex h-20 max-w-[1920px] items-center justify-between px-8">
          <Link to="/home" className="font-headline text-2xl font-black tracking-tight text-white">
            The Sovereign
          </Link>
          <nav className="hidden gap-8 md:flex">
            <Link
              to="/flights"
              className="text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-white/80 hover:text-white"
            >
              Book
            </Link>
            <span className="border-b-2 border-secondary-fixed pb-1 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-white">
              Account
            </span>
          </nav>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="rounded-lg bg-secondary-fixed px-4 py-2 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-primary"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="gold-pattern-bg mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-2 font-headline text-3xl font-black text-on-surface">
          Quản lý tài khoản
        </h1>
        <p className="mb-10 text-on-surface-variant">Cập nhật hồ sơ và tùy chọn bảo mật.</p>
        <div className="space-y-8">
          <section className="glass-card rounded-xl border border-outline-variant/20 p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <User className="h-6 w-6 text-primary" strokeWidth={1.75} />
              <h2 className="font-headline text-xl font-bold">Hồ sơ</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <FieldLabel htmlFor="acc-first">Tên</FieldLabel>
                <TextInput id="acc-first" defaultValue="Minh" />
              </div>
              <div>
                <FieldLabel htmlFor="acc-last">Họ</FieldLabel>
                <TextInput id="acc-last" defaultValue="Nguyễn" />
              </div>
              <div className="md:col-span-2">
                <FieldLabel htmlFor="acc-email">Email</FieldLabel>
                <TextInput id="acc-email" type="email" defaultValue="name@example.com" />
              </div>
            </div>
            <Button type="button" className="mt-6 max-w-xs">
              Lưu thay đổi
            </Button>
          </section>
          <section className="glass-card rounded-xl border border-outline-variant/20 p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <Bell className="h-6 w-6 text-secondary" strokeWidth={1.75} />
              <h2 className="font-headline text-xl font-bold">Thông báo</h2>
            </div>
            <label className="flex items-center gap-3 text-sm text-on-surface-variant">
              <input type="checkbox" defaultChecked className="h-4 w-4 accent-primary" />
              Nhận email khuyến mãi và cập nhật chuyến bay
            </label>
          </section>
          <section className="glass-card rounded-xl border border-outline-variant/20 p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <Lock className="h-6 w-6 text-on-surface-variant" strokeWidth={1.75} />
              <h2 className="font-headline text-xl font-bold">Bảo mật</h2>
            </div>
            <p className="mb-4 text-sm text-on-surface-variant">
              Đổi mật khẩu định kỳ để bảo vệ tài khoản.
            </p>
            <Button
              type="button"
              variant="ghost"
              className="max-w-xs border border-outline-variant/30"
            >
              Đổi mật khẩu
            </Button>
          </section>
        </div>
      </main>
    </div>
  );
}
