import { Link, useParams } from 'react-router-dom';
import styles from '../SitePage/sitePage.module.css';

const MANUAL_IMAGES: Record<string, string> = {
  comprartickets: 'https://primetiximages.s3.amazonaws.com/comprartickets.png',
  crearcuenta: 'https://primetiximages.s3.amazonaws.com/crearcuenta.png',
  transferirtickets: 'https://primetiximages.s3.amazonaws.com/transferirtickets.png',
  vertickets: 'https://primetiximages.s3.amazonaws.com/vertickets.png',
};

export default function ManualPage() {
  const { nombre } = useParams();
  const key = (nombre || '').toLowerCase();
  const src = MANUAL_IMAGES[key] || '';

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Link to="/" className={styles.back}>
          ← Volver al inicio
        </Link>
        <h1 className={styles.title}>Manual</h1>
        {src ? (
          <img
            src={src}
            alt={`Manual ${key}`}
            style={{ width: '100%', height: 'auto', borderRadius: 8, border: '1px solid #2a2a2a' }}
          />
        ) : (
          <p className={styles.lead}>No se encontró un manual para esta ruta.</p>
        )}
      </div>
    </div>
  );
}
