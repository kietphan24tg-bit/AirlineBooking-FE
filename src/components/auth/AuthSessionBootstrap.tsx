import { useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';

export default function AuthSessionBootstrap() {
  const initializedRef = useRef(false);
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const refresh = useAuthStore((state) => state.refresh);
  const fetchMe = useAuthStore((state) => state.fetchMe);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (!accessToken) {
      void refresh({ silent: true });
      return;
    }

    if (!user) {
      void fetchMe();
    }
  }, [accessToken, fetchMe, refresh, user]);

  return null;
}
