import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import AuthSessionBootstrap from './components/auth/AuthSessionBootstrap';
import AppRouter from './routes/AppRouter';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthSessionBootstrap />
      <Toaster richColors position="top-right" closeButton />
      <RouterProvider router={AppRouter} />
    </QueryClientProvider>
  </StrictMode>
);
