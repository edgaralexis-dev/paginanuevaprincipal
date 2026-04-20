import { Headphones } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import styles from './floatingSupport.module.css';

/**
 * Acceso a soporte visible en todo el sitio (fixed). Se oculta en la propia página de contacto.
 */
export default function FloatingSupport() {
  const { pathname } = useLocation();
  if (pathname === '/contactanos') return null;

  return (
    <Link
      to="/contactanos"
      className={styles.fab}
      aria-label="Soporte y contacto"
      title="Soporte"
    >
      <span className={styles.pulse} aria-hidden />
      <span className={styles.inner}>
        <Headphones size={22} strokeWidth={1.85} className={styles.icon} />
      </span>
    </Link>
  );
}
