import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './LegacyRouteFallback.module.css';

type LegacyRouteFallbackProps = {
  title: string;
};

function buildLegacyHref(pathname: string, search: string): string {
  const configuredOrigin = (import.meta.env.VITE_PRIMETIX_WEB_ORIGIN as string | undefined)?.trim();
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const withSearch = `${normalizedPath}${search || ''}`;
  if (!configuredOrigin) return withSearch;
  return `${configuredOrigin.replace(/\/$/, '')}${withSearch}`;
}

export default function LegacyRouteFallback({ title }: LegacyRouteFallbackProps) {
  const location = useLocation();
  const legacyHref = useMemo(
    () => buildLegacyHref(location.pathname, location.search),
    [location.pathname, location.search],
  );
  const hasOrigin = !!(import.meta.env.VITE_PRIMETIX_WEB_ORIGIN as string | undefined)?.trim();

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.text}>
          Esta sección aún se está migrando al nuevo diseño. Puedes usar la versión publicada mientras tanto o volver al
          inicio.
        </p>
        <div className={styles.actions}>
          {hasOrigin ? (
            <a className={styles.linkPrimary} href={legacyHref}>
              Abrir versión actual
            </a>
          ) : null}
          <Link className={hasOrigin ? styles.linkSecondary : styles.linkPrimary} to="/">
            Volver al inicio
          </Link>
        </div>
        {!hasOrigin ? (
          <p className={styles.note}>
            Para enlazar a la web anterior, configura <code>VITE_PRIMETIX_WEB_ORIGIN</code> en el entorno de build.
          </p>
        ) : null}
      </div>
    </div>
  );
}
