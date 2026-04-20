import { Link } from 'react-router-dom';
import styles from '../SitePage/sitePage.module.css';

export default function ForgotPasswordPage() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Link to="/" className={styles.back}>
          ← Volver al inicio
        </Link>
        <h1 className={styles.title}>Recuperar acceso</h1>
        <p className={styles.lead}>
          En el portal actual el acceso se restablece iniciando sesión con tu correo o WhatsApp y el código que te enviamos (OTP).
          No usamos contraseña fija en este flujo.
        </p>
        <p className={styles.lead}>
          Ve a{' '}
          <Link to="/login" className={styles.link}>
            Iniciar sesión
          </Link>{' '}
          y elige verificación por correo o por número.
        </p>
      </div>
    </div>
  );
}
