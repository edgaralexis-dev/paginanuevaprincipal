import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getTicketById } from '../../services/tickets';
import type { TicketPorId } from '../../types/tickets';
import logoSrc from '../../assets/LogoPrimetix.svg';
import styles from './ticketQr.module.css';

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('es-GT', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return iso;
  }
}

function estadoLabel(v: string) {
  if (v.toLowerCase().includes('transfer')) return 'Transferencia';
  if (v.toLowerCase().includes('inactivo') || v.toLowerCase().includes('escane')) return 'Escaneado';
  return 'Activo';
}

function splitSeat(raw?: string) {
  const clean = (raw || '').trim();
  if (!clean) return { leftLabel: 'Asiento', leftValue: '—', rightLabel: 'Ticket', rightValue: '—' };
  const parts = clean.split(/\s+/);
  return {
    leftLabel: parts[0] || 'Asiento',
    leftValue: parts[1] || clean,
    rightLabel: parts[2] || 'Ticket',
    rightValue: parts[3] || `#${parts[1] || '—'}`,
  };
}

export default function TicketQrPage() {
  const { ticketId } = useParams();
  const id = Number(ticketId);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<TicketPorId | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.tokenPrivado || !id) return;
    let cancelled = false;
    (async () => {
      try {
        const raw = await getTicketById(id, user.tokenPrivado);
        if (cancelled) return;
        if ('response' in raw && raw.response === 'SinJWT') {
          logout();
          navigate('/');
          return;
        }
        if ('response' in raw && String(raw.response).startsWith('HTTP_')) {
          setError(`No se pudo cargar el ticket (${raw.response}).`);
          return;
        }
        setTicket(raw as TicketPorId);
      } catch {
        if (!cancelled) setError('No se pudo cargar el detalle del ticket.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, user?.tokenPrivado, logout, navigate]);

  const qrValue = useMemo(() => `PrimetixTicket:${id}`, [id]);
  const qrSrc = useMemo(
    () => `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrValue)}`,
    [qrValue],
  );
  const seat = useMemo(() => splitSeat(ticket?.asiento), [ticket?.asiento]);

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <Link to="/" className={styles.logo}>
          <img src={logoSrc} alt="Primetix" className={styles.logoImg} />
        </Link>
        <Link to="/mis-boletos" className={styles.backLink}>
          ← Mis boletos
        </Link>
      </header>

      <main className={styles.main}>
        <article className={styles.ticketShell}>
          <div className={styles.ticketTop}>
            <div className={styles.ticketBrand}>
              <img src={logoSrc} alt="Primetix" />
              <span>Primetix</span>
            </div>
            <div className={styles.ticketPoster}>
              {ticket?.imagenEvento ? <img src={ticket.imagenEvento} alt="" className={styles.mediaImg} /> : null}
            </div>
          </div>

          <div className={styles.ticketBody}>
            <h1 className={styles.title}>{ticket?.artista || 'Ticket'}</h1>
            <p className={styles.eventName}>{ticket?.artista || 'Evento'}</p>
            <div className={styles.dateStrip}>{ticket ? formatDate(ticket.fechaEvento) : 'Cargando...'}</div>

            <div className={styles.metaGrid}>
              <div>
                <span className={styles.metaLabel}>Localidad</span>
                <span className={styles.metaValue}>{ticket?.localidad || '—'}</span>
              </div>
              <div>
                <span className={styles.metaLabel}>{seat.leftLabel}</span>
                <span className={styles.metaValue}>{seat.leftValue}</span>
              </div>
              <div>
                <span className={styles.metaLabel}>{seat.rightLabel}</span>
                <span className={styles.metaValue}>{seat.rightValue}</span>
              </div>
            </div>

            <div className={styles.ticketLegend}>No válido como ticket</div>
          </div>

          <div className={styles.qrPanel}>
            <div className={styles.qrWrap}>
              <img className={styles.qr} src={qrSrc} alt={`QR Ticket ${id}`} />
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Ticket</span>
              <span className={styles.value}>#{id}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Estado QR</span>
              <span className={styles.status}>{ticket ? estadoLabel(ticket.estado) : '—'}</span>
            </div>
            <p className={styles.qrHint}>
              {ticket?.estado === 'TA'
                ? 'Este QR cambia constantemente. Capturas e impresiones son inválidas para ingreso.'
                : 'Código QR no disponible para este estado de ticket.'}
            </p>
            <div className={styles.row}>
              <span className={styles.label}>Total</span>
              <span className={styles.value}>
                {(ticket?.simboloMoneda || 'Q') + ' '}
                {ticket ? (ticket.precio + (ticket.serviceFee || 0)).toFixed(2) : '—'}
              </span>
            </div>

            {error ? <p className={styles.error}>{error}</p> : null}
          </div>
        </article>
      </main>
    </div>
  );
}

