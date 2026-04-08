import { Calendar, Plane, Settings, Ticket } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '../stores/useAuthStore';
import Button from '../components/ui/Button';

const tiles: {
  to: string;
  title: string;
  desc: string;
  icon: typeof Plane;
}[] = [
  { to: '/flights', title: 'Tìm chuyến bay', desc: 'Khám phá lịch trình và giá', icon: Plane },
  { to: '/trips', title: 'Lịch sử vé', desc: 'Xem booking đã đặt', icon: Ticket },
  {
    to: '/booking/passengers',
    title: 'Đặt chỗ',
    desc: 'Tiếp tục thông tin hành khách',
    icon: Calendar,
  },
  { to: '/account', title: 'Tài khoản', desc: 'Hồ sơ và bảo mật', icon: Settings },
];

export default function Home() {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore(
    useShallow((state) => ({
      user: state.user,
      signOut: state.signOut,
    }))
  );

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : (user?.email ?? 'Khách');

  return (
    <div className="min-h-screen bg-surface-container-low font-body text-on-surface">
      <header className="border-b border-outline-variant/10 bg-surface-container-lowest shadow-sm">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link to="/" className="font-headline text-xl font-black text-primary">
              The Sovereign
            </Link>
            <p className="mt-1 text-sm text-on-surface-variant">
              Xin chào, <span className="font-semibold text-on-surface">{displayName}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/"
              className="rounded-md border border-outline-variant/30 px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-low"
            >
              Trang chủ
            </Link>
            <Button
              type="button"
              variant="ghost"
              className="!w-auto"
              onClick={() => void handleLogout()}
            >
              Đăng xuất
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="mb-2 font-headline text-3xl font-black tracking-tight text-on-surface">
          Bảng điều khiển
        </h1>
        <p className="mb-10 max-w-xl text-on-surface-variant">
          Chọn một mục để tiếp tục hành trình — thiết kế theo stitch_plane Midnight Luxury.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          {tiles.map(({ to, title, desc, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="group flex gap-4 rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-6 shadow-sm transition-all hover:border-secondary/30 hover:shadow-md"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-6 w-6" strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="font-headline text-lg font-bold text-on-surface group-hover:text-primary">
                  {title}
                </h2>
                <p className="mt-1 text-sm text-on-surface-variant">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
