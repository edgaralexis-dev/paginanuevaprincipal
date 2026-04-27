import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from '../SitePage/sitePage.module.css';

export default function TransferenciaPage() {
  const { eventId, ticketId } = useParams();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');

  const canSubmit = useMemo(() => email.includes('@') && email.includes('.'), [email]);

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Link to="/mis-boletos" className={styles.back}>
          ← Volver a mis boletos
        </Link>
        <h1 className={styles.title}>Transferencia de Ticket</h1>
        <p className={styles.lead}>
          Evento {eventId || 'N/D'} · Ticket {ticketId || 'N/D'}
        </p>
        {!user ? (
          <p className={styles.lead}>Debes iniciar sesión para transferir tickets.</p>
        ) : (
          <div style={{ marginTop: 16, border: '1px solid #ddd', borderRadius: 8, padding: 14 }}>
            <label style={{ display: 'block', marginBottom: 10 }}>
              Correo del destinatario
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', marginTop: 6, padding: 8 }}
                placeholder="destinatario@correo.com"
              />
            </label>
            <label style={{ display: 'block', marginBottom: 10 }}>
              Mensaje (opcional)
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ width: '100%', marginTop: 6, padding: 8, minHeight: 90 }}
                placeholder="Mensaje para la persona que recibe el ticket"
              />
            </label>
            <button type="button" className={styles.back} disabled={!canSubmit}>
              Enviar transferencia
            </button>
            <p style={{ marginTop: 10, color: '#666' }}>
              Integración final de envío/aceptación pendiente con el endpoint de transferencia.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
