import { Link } from 'react-router-dom';
import styles from '../SitePage/sitePage.module.css';

export default function SimplePage() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Link to="/" className={styles.back}>
          ← Volver al inicio
        </Link>
        <h1 className={styles.title}>Simple</h1>
        <p className={styles.lead}>
          Pendiente: convertir <code>primetix-simple.html</code> a React (igual que las otras vistas).
        </p>
      </div>
    </div>
  );
}

