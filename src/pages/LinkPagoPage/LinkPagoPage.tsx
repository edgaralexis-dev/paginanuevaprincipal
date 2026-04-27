import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getEventDataById } from '../../services/events';
import { getLinkPagoHeaderFromEncryptedData } from '../../services/linkPago';
import styles from '../SitePage/sitePage.module.css';

export default function LinkPagoPage() {
  const { data } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventName, setEventName] = useState('Evento');
  const [eventArtist, setEventArtist] = useState('Artista');
  const [nextUrl, setNextUrl] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const resp = await getLinkPagoHeaderFromEncryptedData(String(data || ''));
      if (cancelled) return;
      if (!resp?.url?.codigoEvento) {
        setError('No se pudo resolver el enlace de pago.');
        setLoading(false);
        return;
      }
      if (resp.url.estado !== 'UG') {
        setError('Este enlace de pago ya no está disponible.');
        setLoading(false);
        return;
      }
      const ev = await getEventDataById(resp.url.codigoEvento);
      if (!cancelled && ev) {
        setEventName(ev.nombre || 'Evento');
        setEventArtist(ev.artista || 'Artista');
      }
      const selected = (resp.url.detalles || []).map((d) => ({
        name: d.nombre || 'Localidad',
        qty: 1,
        unitPrice: Number(d.precio || 0) + Number(d.fee || 0),
      }));
      const totalQty = selected.reduce((acc, s) => acc + s.qty, 0);
      const first = selected[0];
      const url = `/checkout?eventId=${encodeURIComponent(
        String(resp.url.codigoEvento),
      )}&eventName=${encodeURIComponent(ev?.nombre || eventName)}&eventArtist=${encodeURIComponent(
        ev?.artista || eventArtist,
      )}&locality=${encodeURIComponent(first?.name || '')}&unitPrice=${first?.unitPrice || 0}&qty=${Math.max(
        1,
        totalQty,
      )}&selected=${encodeURIComponent(JSON.stringify(selected))}&linkPago=1`;
      setNextUrl(url);
      setLoading(false);
      window.setTimeout(() => {
        if (!cancelled) navigate(url, { replace: true });
      }, 400);
    })();
    return () => {
      cancelled = true;
    };
  }, [data, eventArtist, eventName, navigate]);

  const resumeText = useMemo(() => `${eventName} · ${eventArtist}`, [eventArtist, eventName]);

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Link de pago</h1>
        {loading ? <p className={styles.lead}>Preparando checkout para {resumeText}...</p> : null}
        {error ? <p className={styles.lead}>{error}</p> : null}
        {!loading && !error && nextUrl ? (
          <p className={styles.lead}>
            Redirigiendo al checkout...
            <br />
            <Link to={nextUrl} className={styles.back}>
              Continuar ahora
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
