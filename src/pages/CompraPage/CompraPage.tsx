import { Link } from 'react-router-dom';
import styles from '../SitePage/sitePage.module.css';

export default function CompraPage() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Link to="/" className={styles.back}>
          ← Volver al inicio
        </Link>
        <h1 className={styles.title}>Compra</h1>
        <p className={styles.lead}>
          Pendiente: convertir <code>primetix-compra.html</code> a React (mapa + asientos + sidebar).
        </p>
      </div>
    </div>
  );
}

