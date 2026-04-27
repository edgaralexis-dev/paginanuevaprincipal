import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from '../SitePage/sitePage.module.css';

export default function CompraPage() {
  const query = new URLSearchParams(window.location.search);
  const eventId = query.get('eventId') || '';
  const eventName = query.get('eventName') || 'Evento';
  const eventArtist = query.get('eventArtist') || 'Artista';
  const locality = query.get('locality') || 'Localidad general';
  const unitPrice = Number(query.get('unitPrice') || '0');
  const selectedRaw = query.get('selected') || '[]';
  const selectedItems = useMemo(() => {
    try {
      const parsed = JSON.parse(selectedRaw) as Array<{ name: string; qty: number; unitPrice: number }>;
      return Array.isArray(parsed) ? parsed.filter((x) => Number(x.qty) > 0) : [];
    } catch {
      return [];
    }
  }, [selectedRaw]);
  const initialQty = Number(query.get('qty') || '1');
  const [qty, setQty] = useState(Number.isFinite(initialQty) && initialQty > 0 ? initialQty : 1);
  const subtotal = qty * Math.max(0, unitPrice);

  const checkoutHref = useMemo(
    () =>
      `/checkout?eventId=${encodeURIComponent(eventId)}&eventName=${encodeURIComponent(
        eventName,
      )}&eventArtist=${encodeURIComponent(eventArtist)}&locality=${encodeURIComponent(
        locality,
      )}&unitPrice=${Math.max(0, unitPrice)}&qty=${qty}&selected=${encodeURIComponent(selectedRaw)}`,
    [eventArtist, eventId, eventName, locality, qty, selectedRaw, unitPrice],
  );

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Link to="/" className={styles.back}>
          ← Volver al inicio
        </Link>
        <h1 className={styles.title}>Compra</h1>
        <p className={styles.lead}>Selecciona localidad y cantidad para continuar al checkout.</p>
        <div style={{ marginTop: 16, border: '1px solid #ddd', borderRadius: 8, padding: 14 }}>
          <p style={{ margin: 0 }}>
            <strong>{eventName}</strong>
          </p>
          <p style={{ marginTop: 4, color: '#666' }}>{eventArtist}</p>
          <p style={{ marginTop: 4, color: '#666' }}>Código de evento: {eventId || 'N/D'}</p>
          <p style={{ marginTop: 4, color: '#666' }}>Localidad: {locality.replaceAll('_', ' ')}</p>
          <p style={{ marginTop: 4, color: '#666' }}>
            Precio unitario: Q {Math.max(0, unitPrice).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
          </p>
          <label style={{ display: 'block', marginTop: 12 }}>
            Cantidad de boletos
            <select
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              style={{ marginLeft: 8, padding: '6px 8px' }}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
            </select>
          </label>
          <p style={{ marginTop: 10, fontWeight: 700 }}>
            Subtotal: Q {subtotal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
          </p>
          {selectedItems.length > 0 ? (
            <div style={{ marginTop: 10 }}>
              <p style={{ margin: 0, fontWeight: 700 }}>Detalle por localidad</p>
              {selectedItems.map((it) => (
                <p key={it.name} style={{ margin: '4px 0', color: '#555' }}>
                  {it.name.replaceAll('_', ' ')}: {it.qty} x Q{' '}
                  {Number(it.unitPrice || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                </p>
              ))}
            </div>
          ) : null}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Link to={checkoutHref} className={styles.back}>
              Continuar al checkout
            </Link>
            <Link to="/eventos" className={styles.back}>
              Cambiar evento
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

