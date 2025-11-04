import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Bookings from './pages/Bookings';
import FormDetails from './pages/FormDetails';
import Forms from './pages/Forms';
import ResponseDetails from './pages/ResponseDetails';
import Customers from './pages/Customers';
import Plans from './pages/Plans';
import HelpDesk from './pages/HelpDesk';
import ResourceManagement from './pages/Resources';
import BookingDetail from './pages/BookingDetails';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/bookings/:id" element={<BookingDetail />} />        
        <Route path="/resources" element={<ResourceManagement />} />
        <Route path="/forms" element={<Forms />} />
        <Route path="/forms/:formId" element={<FormDetails />} />   
        <Route path="/forms/:formId/responses/:responseId" element={<ResponseDetails />} />     
        <Route path="/customers" element={<Customers />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/help-desk" element={<HelpDesk />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
