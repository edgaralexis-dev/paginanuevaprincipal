import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReservaLink from '../../components/ReservaLink/ReservaLink';
import { flattenEventsSortedByStartDate, getEventsByCountryGrouped, type ResumeEvent } from '../../services/events';
import styles from './eventos.module.css';

export default function EventosBridge() {
  const params = useParams();

  // Rutas legacy: `/eventos/:fechaIn/:fechaFin/:nombre/:genero`
  // En este frontend todavía no filtramos por esos params; se muestran próximos.
  const [events, setEvents] = useState<ResumeEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => {
    if (params?.nombre && params.nombre !== '1') {
      try {
        return decodeURIComponent(params.nombre);
      } catch {
        return params.nombre;
      }
    }
    return 'Eventos';
  }, [params?.nombre]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const grouped = await getEventsByCountryGrouped(1);
        const sorted = flattenEventsSortedByStartDate(grouped);
        if (!cancelled) setEvents(sorted);
      } catch {
        if (!cancelled) {
          setEvents([]);
          setError('No se pudieron cargar eventos. Revisa tu conexión o el backend (VITE_URL_API).');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div>
            <h1 className={styles.title}>{title}</h1>
          </div>
          <Link to="/" className={styles.back}>
            ← Volver
          </Link>
        </div>

        {error ? <div className={styles.error}>{error}</div> : null}

        <div className={styles.grid}>
          {(events ?? []).map((ev) => (
            <ReservaLink
              key={ev.codigo}
              nombre={ev.nombre}
              artista={ev.artista}
              codigo={ev.codigo}
              className={styles.card}
            >
              <div className={styles.photo}>
                {ev.imagenEvento ? <img src={ev.imagenEvento} alt="" loading="lazy" decoding="async" /> : null}
                <div className={styles.photoGrad} aria-hidden />
              </div>
              <div className={styles.body}>
                <div className={styles.tag}>
                  <span className={styles.dot} aria-hidden />
                  Próximo
                </div>
                <div className={styles.name} title={ev.nombre}>
                  {ev.nombre}
                </div>
                <div className={styles.meta} title={ev.artista}>
                  {ev.artista}
                </div>
                <div className={styles.meta} title={ev.ubicacion}>
                  {ev.ubicacion}
                </div>
              </div>
            </ReservaLink>
          ))}
        </div>

        {events && events.length === 0 && !error ? (
          <p className={styles.sub}>No hay eventos para mostrar.</p>
        ) : null}
      </div>
    </div>
  );
}

