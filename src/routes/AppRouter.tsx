import { createBrowserRouter } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import App from '../App';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Home from '../pages/Home';
import PasswordResetConfirm from '../pages/PasswordResetConfirm';
import ProtectedRoute from './ProtectedRoute';

const AppRouter = createBrowserRouter([
  //public route
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/password-reset/confirm',
    element: <PasswordResetConfirm />,
  },
  //protected route
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/app',
        element: <App />,
      },
      {
        path: '/home',
        element: <Home />,
      },
    ],
  },
]);

export default AppRouter;
