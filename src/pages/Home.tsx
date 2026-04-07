import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '../stores/useAuthStore';
import Button from '../components/ui/Button';

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
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface px-6">
      <div className="w-full max-w-md rounded-xl bg-surface-lowest px-8 py-10 text-center shadow-[var(--shadow-ambient)]">
        <h1 className="font-headline text-3xl font-bold text-on-surface">Đặt Vé Máy Bay</h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Xin chào, <span className="font-medium text-on-surface">{displayName}</span>.
        </p>
        <p className="mt-1 text-sm text-on-surface-variant">Trang tổng quan sau khi đăng nhập.</p>
        <Button
          type="button"
          className="mt-8 w-full"
          variant="ghost"
          onClick={() => void handleLogout()}
        >
          Đăng xuất
        </Button>
      </div>
    </main>
  );
}
