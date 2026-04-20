import { Link, useNavigate, useParams } from 'react-router-dom';
import styles from './reserva.module.css';

export default function ReservaBridge() {
  const navigate = useNavigate();
  const { eventName, eventArtist, eventId } = useParams();

  const nombre = safeDecode(eventName) || 'Evento';
  const artista = safeDecode(eventArtist) || '—';
  const codigo = safeDecode(eventId) || '—';

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Link to="/eventos" className={styles.back}>
          ← Ver eventos
        </Link>

        <div className={styles.card}>
          <div className={styles.hero} aria-hidden>
            <div className={styles.grad} />
          </div>
          <div className={styles.body}>
            <h1 className={styles.title}>{nombre}</h1>
            <p className={styles.meta}>
              <strong>Artista</strong>: {artista}
              <br />
              <strong>Código</strong>: {codigo}
            </p>

            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={() => navigate('/compra')}>
                Comprar boletos
              </button>
              <Link to="/" className={styles.ghost}>
                Inicio
              </Link>
              <Link to="/checkout" className={styles.ghost}>
                Ir a checkout
              </Link>
            </div>

            <div className={styles.hint}>
              Pendiente: aquí va el detalle real del evento (localidades, mapa/asientos, precios) consumiendo el API.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function safeDecode(v: string | undefined): string {
  if (!v) return '';
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}
