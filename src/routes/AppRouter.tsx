import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import AccountManagement from '../pages/AccountManagement';
import Checkout from '../pages/Checkout';
import FlightResults from '../pages/FlightResults';
import Landing from '../pages/Landing';
import Login from '../pages/Login';
import PassengerInfo from '../pages/PassengerInfo';
import PasswordResetConfirm from '../pages/PasswordResetConfirm';
import Register from '../pages/Register';
import SeatSelection from '../pages/SeatSelection';
import ManageBookingSeatSelection from '../pages/ManageBookingSeatSelection';
import ManageBookingAddExtras from '../pages/ManageBookingAddExtras';
import TripHistory from '../pages/TripHistory';
import ManageBooking from '../pages/ManageBooking';
import Experience from '../pages/Experience';
import CheckoutResult from '../pages/CheckoutResult';
import Checkin from '../pages/Checkin';
import CancelFlight from '../pages/CancelFlight';
import ChangeFlight from '../pages/ChangeFlight';

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
    path: '/experience',
    element: <Experience />,
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
    path: '/booking/passengers',
    element: <PassengerInfo />,
  },
  {
    path: '/booking/passengers/seats',
    element: <SeatSelection />,
  },
  {
    path: '/booking/checkout',
    element: <Checkout />,
  },
  {
    path: '/booking/checkout/result',
    element: <CheckoutResult />,
  },
  {
    path: '/booking/checkout/success',
    element: <CheckoutResult />,
  },
  {
    path: '/booking/checkout/failed',
    element: <CheckoutResult />,
  },
  {
    path: '/payment/cancel',
    element: <CheckoutResult />,
  },
  {
    path: '/payment/failed',
    element: <CheckoutResult />,
  },
  {
    path: '/payment/success',
    element: <CheckoutResult />,
  },
  {
    path: '/trips',
    element: <TripHistory />,
  },
  {
    path: '/manage-booking',
    element: <ManageBooking />,
  },
  {
    path: '/manage-booking/:id',
    element: <ManageBooking />,
  },
  {
    path: '/manage-booking/check-in',
    element: <Checkin />,
  },
  {
    path: '/manage-booking/seat-selection',
    element: <ManageBookingSeatSelection />,
  },
  {
    path: '/manage-booking/add-services',
    element: <ManageBookingAddExtras />,
  },
  {
    path: '/manage-booking/cancel',
    element: <CancelFlight />,
  },
  {
    path: '/manage-booking/change-flight',
    element: <ChangeFlight />,
  },
  {
    path: '/app',
    element: <App />,
  },
  {
    path: '/account',
    element: <AccountManagement />,
  },
]);

export default AppRouter;
