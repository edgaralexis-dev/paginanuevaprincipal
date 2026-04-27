import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { unsubscribeUserNotifications } from '../../services/unsubscribe';
import styles from '../SitePage/sitePage.module.css';

export default function UnsubscribePage() {
  const { id } = useParams();
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await unsubscribeUserNotifications(String(id || ''));
      if (cancelled) return;
      setDone(true);
      setFailed(!ok);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Notificaciones por correo</h1>
        {!done ? <p className={styles.lead}>Procesando solicitud de baja...</p> : null}
        {done && !failed ? (
          <p className={styles.lead}>Te has dado de baja de las notificaciones correctamente.</p>
        ) : null}
        {done && failed ? (
          <p className={styles.lead}>
            No se pudo confirmar la baja en este momento. Intenta nuevamente más tarde.
          </p>
        ) : null}
        <Link to="/" className={styles.back}>
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
