import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import AccountManagement from '../pages/AccountManagement';
import FlightResults from '../pages/FlightResults';
import Home from '../pages/Home';
import Landing from '../pages/Landing';
import Login from '../pages/Login';
import PassengerInfo from '../pages/PassengerInfo';
import PasswordResetConfirm from '../pages/PasswordResetConfirm';
import Register from '../pages/Register';
import SeatSelection from '../pages/SeatSelection';
import TripHistory from '../pages/TripHistory';
import ProtectedRoute from './ProtectedRoute';

const AppRouter = createBrowserRouter([
  {
    path: '/',
    element: <Landing />,
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
    path: '/flights',
    element: <FlightResults />,
  },
  {
    path: '/password-reset/confirm',
    element: <PasswordResetConfirm />,
  },
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
      {
        path: '/booking/passengers',
        element: <PassengerInfo />,
      },
      {
        path: '/booking/seats',
        element: <SeatSelection />,
      },
      {
        path: '/account',
        element: <AccountManagement />,
      },
      {
        path: '/trips',
        element: <TripHistory />,
      },
    ],
  },
]);

export default AppRouter;
