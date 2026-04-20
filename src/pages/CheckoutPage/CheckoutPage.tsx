import { Link } from 'react-router-dom';
import styles from '../SitePage/sitePage.module.css';

export default function CheckoutPage() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Link to="/" className={styles.back}>
          ← Volver al inicio
        </Link>
        <h1 className={styles.title}>Checkout</h1>
        <p className={styles.lead}>
          Pendiente: convertir <code>primetix-checkout.html</code> a React (pasos, OTP, pago, confirmación).
        </p>
      </div>
    </div>
  );
}

