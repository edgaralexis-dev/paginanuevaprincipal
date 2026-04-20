import { Link } from 'react-router-dom';
import styles from '../SitePage/sitePage.module.css';

export default function RegisterPage() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Link to="/" className={styles.back}>
          ← Volver al inicio
        </Link>
        <h1 className={styles.title}>Crear cuenta</h1>
        <p className={styles.lead}>
          El registro completo con el flujo legacy vive en el portal anterior. En esta versión nueva, la sesión se inicia con
          correo o WhatsApp y código OTP (igual que en <Link to="/login" className={styles.link}>Iniciar sesión</Link>).
        </p>
        <p className={styles.lead}>
          Si ya tenías cuenta en Primetix, usa «Iniciar sesión» con el mismo correo o número.
        </p>
      </div>
    </div>
  );
}
