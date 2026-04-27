import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from '../SitePage/sitePage.module.css';

export default function VentaTicketsPage() {
  const { eventId, ticketId } = useParams();
  const { user } = useAuth();
  const [price, setPrice] = useState('0');
  const [terms, setTerms] = useState(false);

  const validPrice = useMemo(() => Number(price) > 0, [price]);

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Link to="/mis-boletos" className={styles.back}>
          ← Volver a mis boletos
        </Link>
        <h1 className={styles.title}>Venta de Ticket</h1>
        <p className={styles.lead}>
          Evento {eventId || 'N/D'} · Ticket {ticketId || 'N/D'}
        </p>
        {!user ? (
          <p className={styles.lead}>Debes iniciar sesión para vender tickets.</p>
        ) : (
          <div style={{ marginTop: 16, border: '1px solid #ddd', borderRadius: 8, padding: 14 }}>
            <label style={{ display: 'block', marginBottom: 10 }}>
              Precio de reventa (Q)
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                style={{ width: '100%', marginTop: 6, padding: 8 }}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
              Acepto términos de reventa y comisión aplicable.
            </label>
            <button type="button" className={styles.back} disabled={!validPrice || !terms}>
              Publicar ticket
            </button>
            <p style={{ marginTop: 10, color: '#666' }}>
              Integración final de reventa pendiente con el endpoint de publicación.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
