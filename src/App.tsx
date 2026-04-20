import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { usePageTitle } from './hooks/usePageTitle';
import RequireAuth from './components/RequireAuth';
import HomePage from './pages/HomePage/HomePage';
import CompraPage from './pages/CompraPage/CompraPage';
import CheckoutPage from './pages/CheckoutPage/CheckoutPage';
import SimplePage from './pages/SimplePage/SimplePage';
import LoginPage from './pages/LoginPage/LoginPage';
import MisBoletosPage from './pages/MisBoletosPage/MisBoletosPage';
import TicketQrPage from './pages/TicketQrPage/TicketQrPage';
import ContactPage from './pages/ContactPage/ContactPage';
import FaqsPage from './pages/FaqsPage/FaqsPage';
import RegisterPage from './pages/RegisterPage/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage/ForgotPasswordPage';
import FloatingSupport from './components/FloatingSupport/FloatingSupport';
import ErrorBoundary from './components/ErrorBoundary';
import ReservaBridge from './pages/ReservaBridge/ReservaBridge';
import EventosBridge from './pages/EventosBridge/EventosBridge';

export default function App() {
  const location = useLocation();
  usePageTitle();

  // Workaround estable para este entorno: render directo de login.
  if (location.pathname === '/login' || location.pathname === '/login/') {
    return (
      <>
        <ErrorBoundary>
          <LoginPage />
        </ErrorBoundary>
        <FloatingSupport />
      </>
    );
  }

  return (
    <>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Navigate to="/login" replace />} />
      <Route path="/login/" element={<Navigate to="/login" replace />} />
      <Route
        path="/mis-boletos"
        element={
          <RequireAuth>
            <ErrorBoundary>
              <MisBoletosPage />
            </ErrorBoundary>
          </RequireAuth>
        }
      />
      <Route
        path="/ticketqr/:eventId/:ticketId/:AsientoId"
        element={
          <RequireAuth>
            <ErrorBoundary>
              <TicketQrPage />
            </ErrorBoundary>
          </RequireAuth>
        }
      />
      <Route
        path="/ticketqr/:eventId/:ticketId"
        element={
          <RequireAuth>
            <ErrorBoundary>
              <TicketQrPage />
            </ErrorBoundary>
          </RequireAuth>
        }
      />
      <Route path="/userticket/misboletos" element={<Navigate to="/mis-boletos" replace />} />
      <Route path="/compra" element={<CompraPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/simple" element={<SimplePage />} />
      <Route path="/contactanos" element={<ContactPage />} />
      <Route path="/FAQs/:tipo" element={<FaqsPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/eventos/:fechaIn/:fechaFin/:nombre/:genero" element={<EventosBridge />} />
      <Route path="/eventos" element={<EventosBridge />} />
      <Route path="/eventos/" element={<EventosBridge />} />
      <Route path="/reserva/:eventName/:eventArtist/:eventId/:embajador" element={<ReservaBridge />} />
      <Route path="/reserva/:eventName/:eventArtist/:eventId" element={<ReservaBridge />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <FloatingSupport />
    </>
  );
}
