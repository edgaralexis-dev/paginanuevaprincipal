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
import LegacyRouteFallback from './components/LegacyRouteFallback';
import TransferenciaPage from './pages/TransferenciaPage/TransferenciaPage';
import VentaTicketsPage from './pages/VentaTicketsPage/VentaTicketsPage';
import ValidacionCorreoPage from './pages/ValidacionCorreoPage/ValidacionCorreoPage';
import ManualPage from './pages/ManualPage/ManualPage';
import UnsubscribePage from './pages/UnsubscribePage/UnsubscribePage';
import LinkPagoPage from './pages/LinkPagoPage/LinkPagoPage';
import RedirectAndClosePage from './pages/RedirectAndClosePage/RedirectAndClosePage';
import RegistroVentaPage from './pages/RegistroVentaPage/RegistroVentaPage';

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
      <Route path="/userticket/boletospasados" element={<Navigate to="/mis-boletos" replace />} />
      <Route path="/userticket/transferencia" element={<Navigate to="/mis-boletos" replace />} />
      <Route path="/userticket/transferencia/:usuario" element={<Navigate to="/mis-boletos" replace />} />
      <Route path="/userticket/transferidos_vendidos" element={<Navigate to="/mis-boletos" replace />} />
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
      <Route path="/elsalvador" element={<Navigate to="/" replace />} />
      <Route path="/conciertos-guatemala" element={<Navigate to="/" replace />} />
      <Route path="/tickets-guatemala" element={<Navigate to="/" replace />} />
      <Route path="/eventos-guatemala" element={<Navigate to="/" replace />} />
      <Route path="/deportes-guatemala" element={<Navigate to="/" replace />} />
      <Route path="/teatro-guatemala" element={<Navigate to="/" replace />} />
      <Route path="/conferencias-guatemala" element={<Navigate to="/" replace />} />
      <Route path="/cashless" element={<LegacyRouteFallback title="Cashless" />} />
      <Route path="/cashless/" element={<LegacyRouteFallback title="Cashless" />} />
      <Route path="/cashless/*" element={<LegacyRouteFallback title="Cashless" />} />
      <Route path="/EventoPrivadoNuevo" element={<LegacyRouteFallback title="Evento Privado" />} />
      <Route path="/qr/:eventName/:eventArtist/:eventId" element={<Navigate to="/mis-boletos" replace />} />
      <Route
        path="/VentaTickets/:eventId/:ticketId"
        element={
          <RequireAuth>
            <VentaTicketsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/Transferencia/:eventId/:ticketId"
        element={
          <RequireAuth>
            <TransferenciaPage />
          </RequireAuth>
        }
      />
      <Route path="/validacion/:correo" element={<ValidacionCorreoPage />} />
      <Route path="/perfil" element={<Navigate to="/mis-boletos?tab=perfil" replace />} />
      <Route path="/manual/:nombre" element={<ManualPage />} />
      <Route path="/unsubscribe/:id" element={<UnsubscribePage />} />
      <Route path="/linkpago/:data" element={<LinkPagoPage />} />
      <Route path="/eventoprivado/:eventId/:userId/:nombre/" element={<LegacyRouteFallback title="Evento privado" />} />
      <Route path="/promotor/:promotorId/:nombre/" element={<LegacyRouteFallback title="Promotor" />} />
      <Route path="/redirect-and-close" element={<RedirectAndClosePage />} />
      <Route path="/formularioDelirio" element={<LegacyRouteFallback title="Formulario" />} />
      <Route
        path="/registrodeventa"
        element={
          <RequireAuth>
            <ErrorBoundary>
              <RegistroVentaPage />
            </ErrorBoundary>
          </RequireAuth>
        }
      />
      <Route path="/:codigoUsuario" element={<HomePage />} />
      <Route path="/:artista/:pais" element={<HomePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <FloatingSupport />
    </>
  );
}
