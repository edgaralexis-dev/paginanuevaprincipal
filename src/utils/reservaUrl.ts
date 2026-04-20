/**
 * Misma convención que paginaprincipal (ImageList / Banner2):
 * `/reserva/${nombre}/${artista}/${codigo}`
 */
export function buildReservaPath(nombre: string, artista: string, codigo: number | string): string {
  // Encode por segmento para evitar rutas rotas por espacios, slashes, tildes, etc.
  const n = encodeURIComponent(nombre);
  const a = encodeURIComponent(artista);
  const c = encodeURIComponent(String(codigo));
  return `/reserva/${n}/${a}/${c}`;
}

/**
 * Origen del portal donde vive el Booking (`/reserva/...`).
 * En esta versión todo corre dentro de la SPA (no redirige a otro dominio).
 */
export function primetixWebOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return '';
}

export function buildReservaHref(nombre: string, artista: string, codigo: number | string): string {
  // Navegación interna (React Router).
  return buildReservaPath(nombre, artista, codigo);
}

/** Enlaces a otras rutas del portal (ej. listado VerEvento). */
export function primetixWebHref(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return p;
}
