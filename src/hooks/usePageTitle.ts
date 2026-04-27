import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const BRAND = 'Primetix';

export function usePageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname === '/' || pathname === '') {
      document.title = `${BRAND} | Próximos eventos`;
      return;
    }
    if (pathname === '/login' || pathname === '/login/') {
      document.title = `Iniciar sesión | ${BRAND}`;
      return;
    }
    if (pathname === '/mis-boletos') {
      document.title = `Mis boletos | ${BRAND}`;
      return;
    }
    if (pathname.startsWith('/ticketqr/')) {
      document.title = `Ticket QR | ${BRAND}`;
      return;
    }
    if (pathname.startsWith('/reserva')) {
      document.title = `Compra de boletos | ${BRAND}`;
      return;
    }
    if (pathname.startsWith('/compra')) {
      document.title = `Compra | ${BRAND}`;
      return;
    }
    if (pathname.startsWith('/checkout')) {
      document.title = `Checkout | ${BRAND}`;
      return;
    }
    if (pathname.startsWith('/registrodeventa')) {
      document.title = `Registro de compra | ${BRAND}`;
      return;
    }
    if (pathname.startsWith('/qr/')) {
      document.title = `Ticket | ${BRAND}`;
      return;
    }
    if (pathname.startsWith('/cashless')) {
      document.title = `Cashless | ${BRAND}`;
      return;
    }
    if (pathname === '/contactanos') {
      document.title = `Contacto | ${BRAND}`;
      return;
    }
    if (pathname.startsWith('/FAQs')) {
      document.title = `Preguntas frecuentes | ${BRAND}`;
      return;
    }
    if (pathname === '/register') {
      document.title = `Crear cuenta | ${BRAND}`;
      return;
    }
    if (pathname === '/forgot-password') {
      document.title = `Recuperar contraseña | ${BRAND}`;
      return;
    }
    if (pathname === '/simple') {
      document.title = `Primetix — Simple`;
      return;
    }
    if (pathname.startsWith('/perfil')) {
      document.title = `Perfil | ${BRAND}`;
      return;
    }
    if (pathname.startsWith('/manual')) {
      document.title = `Manual | ${BRAND}`;
      return;
    }
    if (pathname.startsWith('/linkpago')) {
      document.title = `Link de pago | ${BRAND}`;
      return;
    }
    document.title = BRAND;
  }, [pathname]);
}
