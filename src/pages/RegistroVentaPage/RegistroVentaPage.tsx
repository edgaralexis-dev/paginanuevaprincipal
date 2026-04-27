import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { registerSale, saveSaleError, type RegisterOrderPayload } from '../../services/payment';
import styles from './registroVenta.module.css';

function readBodyVenta(): RegisterOrderPayload | null {
  const raw = localStorage.getItem('bodyVenta');
  if (!raw || raw === 'null') return null;
  try {
    const parsed = JSON.parse(raw) as RegisterOrderPayload;
    if (!parsed || typeof parsed !== 'object' || !('codigoEvento' in parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isSinJwt(data: unknown): boolean {
  if (typeof data === 'string') return data === 'SinJWT' || data.includes('SinJWT');
  if (data && typeof data === 'object') {
    const r = data as { response?: string; respuesta?: string };
    return r.response === 'SinJWT' || String(r.respuesta || '').includes('SinJWT');
  }
  return false;
}

export default function RegistroVentaPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [status, setStatus] = useState<'working' | 'ok' | 'err' | 'noop'>('working');
  const [detail, setDetail] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const body = readBodyVenta();
      if (!body) {
        setStatus('noop');
        setDetail('No hay datos de venta pendientes. Si ya pagaste, revisa Mis boletos.');
        return;
      }

      if (!user?.tokenPrivado) {
        setStatus('err');
        setDetail('Necesitas iniciar sesión para finalizar el registro de tu compra.');
        return;
      }

      try {
        await saveSaleError(body.codigoPago, `IntentoVentaBODY${JSON.stringify(body)}`);

        const res = await registerSale(body, user.tokenPrivado);

        if (isSinJwt(res.data)) {
          logout();
          navigate('/', { replace: true });
          return;
        }

        if (!res.ok) {
          await saveSaleError(body.codigoPago, `RegistraVenta HTTP ${res.status} ${JSON.stringify(res.data)}`);
          setStatus('err');
          setDetail('No se pudo registrar la venta. Si el cargo ya se aplicó, contacta soporte con tu correo.');
          return;
        }

        localStorage.removeItem('bodyVenta');
        setStatus('ok');
        setDetail('Tu compra se registró correctamente.');
        window.setTimeout(() => navigate('/mis-boletos', { replace: true }), 1200);
      } catch (e) {
        await saveSaleError(body.codigoPago, `${String(e)} || Body: ${JSON.stringify(body)}`);
        setStatus('err');
        setDetail('Ocurrió un error al registrar la venta. Intenta de nuevo o revisa Mis boletos.');
      }
    })();
  }, [logout, navigate, user?.tokenPrivado]);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Finalizando compra</h1>
        <p className={styles.text}>
          {status === 'working' ? 'Registrando tu compra, espera un momento…' : detail}
        </p>
        {status === 'noop' || status === 'err' ? (
          <div className={styles.actions}>
            <Link to="/mis-boletos" className={styles.primary}>
              Ir a mis boletos
            </Link>
            <Link to="/" className={styles.secondary}>
              Inicio
            </Link>
          </div>
        ) : null}
        {status === 'ok' ? (
          <p className={styles.hint}>Redirigiendo a tus boletos…</p>
        ) : null}
        <p className={styles.legacy}>Si esta ventana se abrió al pagar, también puedes cerrarla manualmente.</p>
      </div>
    </div>
  );
}
