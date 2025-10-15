import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Bookings from './pages/Bookings';
import BookingDetails from './pages/BookingDetails';
import Resources from './pages/Resources';
import Forms from './pages/Forms';
import FormDetails from './pages/FormDetails';
import Customers from './pages/Customers';
import Plans from './pages/Plans';
import HelpDesk from './pages/HelpDesk';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/bookings/:bookingId" element={<BookingDetails />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/forms" element={<Forms />} />
        <Route path="/forms/:formId" element={<FormDetails />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/help-desk" element={<HelpDesk />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
