import { useAuthStore } from '../stores/useAuthStore';
import { useShallow } from 'zustand/react/shallow';
import { Outlet, Navigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';

const ProtectedRoute = () => {
  const [starting, setStarting] = useState(true);
  const { accessToken, user, loading, refresh, fetchMe } = useAuthStore(
    useShallow((state) => ({
      accessToken: state.accessToken,
      user: state.user,
      loading: state.loading,
      refresh: state.refresh,
      fetchMe: state.fetchMe,
    }))
  );
  const init = useCallback(async () => {
    if (!accessToken) {
      await refresh();
    }
    if (accessToken && !user) {
      await fetchMe();
    }
    setStarting(false);
  }, [accessToken, fetchMe, refresh, user]);

  useEffect(() => {
    void init();
  }, [init]);
  if (loading || starting) {
    return <div>Loading...</div>;
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

export default ProtectedRoute;
