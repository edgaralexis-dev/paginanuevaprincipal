import { normalizeIdPais } from '../utils/idPais';
import { apiGet, apiPut } from './apiClient';

export type ResumeEvent = {
  codigo: number;
  nombre: string;
  artista: string;
  ubicacion: string;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  imagenEvento: string;
  [k: string]: unknown;
};

/** Agrupado por categoría — mismo contrato que paginaprincipal (`Welcome` + `ImageList`). */
export type ResumeEventsByCountry = {
  nombre: string;
  eventos: ResumeEvent[];
};

export type EventData = {
  codigo: number;
  nombre: string;
  artista: string;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  ubicacion: string;
  imagenEvento: string;
  spotify?: string;
  mapaUrl?: string;
  tipoEvento?: string;
  customAccountId?: string;
  eventoImagenes?: EventImage[];
};

export type EventImage = {
  codigoTipo?: number;
  nombreTipo?: string;
  urlImagen?: string;
  orden?: number;
};

/** Listado plano (p. ej. `VerEvento` en paginaprincipal). */
export async function getEvents(): Promise<ResumeEvent[]> {
  return apiGet<ResumeEvent[]>('/primetixapi/api/Evento/ObtenerEventos');
}

/**
 * Home de paginaprincipal: `Welcome` → `getEventsByCountry` → este endpoint.
 * GET `/primetixapi/api/Evento/ObtenerEventosAgrupadosPorIdPais/{idPais}`
 */
export async function getEventsByCountryGrouped(idPais: number): Promise<ResumeEventsByCountry[]> {
  const id = normalizeIdPais(idPais);
  return apiGet<ResumeEventsByCountry[]>(`/primetixapi/api/Evento/ObtenerEventosAgrupadosPorIdPais/${id}`);
}

/** Contrato legacy de Booking: datos completos de evento por id. */
export async function getEventDataById(idEvento: number): Promise<EventData | null> {
  try {
    return await apiGet<EventData>(`/primetixapi/api/Evento/ObtenerDatosEvento?CodigoEvento=${idEvento}`);
  } catch {
    return null;
  }
}

/** Endpoint completo usado en Booking legacy (trae `spotify`, `mapaUrl`, etc.). */
export async function getEventDetailById(idEvento: number): Promise<Partial<EventData> | null> {
  try {
    return await apiGet<Partial<EventData>>(`/primetixapi/api/Evento/ObtenerEventoPorId/${idEvento}`);
  } catch {
    return null;
  }
}

function mapSrcInteractivoDesdeEvento(ed: Partial<EventData> | null | undefined): string {
  if (!ed) return '';
  const m = ed.mapaUrl?.trim();
  return (m || '') as string;
}

export function isSvgUrl(url: string | undefined | null): boolean {
  return !!url && /\.svg(\?|$)/i.test(url.trim());
}

function isRasterUrl(url: string | undefined | null): boolean {
  return !!url && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url.trim());
}

/** Copia de lógica de Booking: NO usar MapaDashboard (tipo 7) como imagen compra rápida. */
export function getCompraRapidaImageUrl(ed: Partial<EventData> | null | undefined): string {
  if (!ed) return '';
  const list = (ed.eventoImagenes || []).filter((e) => (e?.urlImagen || '').trim());

  const porNombreTipo = list.find((e) => {
    const n = (e.nombreTipo || '').toLowerCase();
    if (!n) return false;
    return n.includes('compra') && (n.includes('rapida') || n.includes('rápida'));
  });
  if (porNombreTipo?.urlImagen?.trim()) return porNombreTipo.urlImagen.trim();

  const tiposPreferidos = [9, 6, 8, 10, 11, 12];
  for (const t of tiposPreferidos) {
    const u = list.find((e) => Number(e.codigoTipo) === t)?.urlImagen?.trim();
    if (u) return u;
  }

  const mapSrc = mapSrcInteractivoDesdeEvento(ed).trim().toLowerCase();
  const excluidos = new Set([1, 5, 7]);
  const ordenados = [...list].sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));
  const fallback = ordenados.find((e) => {
    const ct = Number(e.codigoTipo);
    if (excluidos.has(ct)) return false;
    const u = (e.urlImagen || '').trim();
    if (!u) return false;
    if (isSvgUrl(u)) return false;
    if (mapSrc && u.toLowerCase() === mapSrc && isSvgUrl(mapSrc)) return false;
    return isRasterUrl(u);
  });

  return (fallback?.urlImagen || '').trim();
}

function esCompraRapidaOCompraMixta(tipo: string | undefined | null): boolean {
  return tipo === 'Evento Con Compra Rápida' || tipo === 'Evento Con Compra Mixta';
}

function tieneImagenCompraRapida(ed: Partial<EventData> | null | undefined): boolean {
  if (!ed?.eventoImagenes?.length) return false;
  const list = ed.eventoImagenes.filter((e) => (e?.urlImagen || '').trim());
  if (!list.length) return false;
  if (
    list.some((e) => {
      const n = (e.nombreTipo || '').toLowerCase();
      return n.includes('compra') && (n.includes('rapida') || n.includes('rápida'));
    })
  )
    return true;
  return list.some((e) => Number(e.codigoTipo) === 6 || Number(e.codigoTipo) === 9);
}

function debeUsarMapaSvgInteractivo(ed: Partial<EventData> | null | undefined): boolean {
  if (!ed) return false;
  if (esCompraRapidaOCompraMixta(ed.tipoEvento)) return false;
  if (tieneImagenCompraRapida(ed)) return false;
  if (ed.tipoEvento !== 'Evento publico Mapa Pie') return false;
  return isSvgUrl(mapSrcInteractivoDesdeEvento(ed));
}

/** Fuente del SVG interactivo en Booking (prioriza compra rápida si es SVG). */
export function getInteractiveSvgSourceForBooking(ed: Partial<EventData> | null | undefined): string {
  if (!ed) return '';
  const compraRapidaSrc = getCompraRapidaImageUrl(ed);
  if (isSvgUrl(compraRapidaSrc)) return compraRapidaSrc;
  const m = mapSrcInteractivoDesdeEvento(ed);
  if (isSvgUrl(m) || debeUsarMapaSvgInteractivo(ed)) return m;
  return '';
}

function eventDateToMs(fecha: string): number {
  const t = Date.parse(fecha);
  if (!Number.isNaN(t)) return t;
  const m = fecha.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]), Number(m[5]));
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }
  return 0;
}

/** Igual que `ImageList` (`eventosOrdenados`): aplana categorías y ordena por `fechaHoraInicio`. */
export function flattenEventsSortedByStartDate(groups: ResumeEventsByCountry[]): ResumeEvent[] {
  return groups
    .flatMap((c) => c.eventos)
    .slice()
    .sort((a, b) => eventDateToMs(a.fechaHoraInicio) - eventDateToMs(b.fechaHoraInicio));
}

/** Igual que paginaprincipal (Event.tsx): PUT agregaHitEvento. Fallos silenciados (no bloquea navegación). */
export async function incrementEventClickCount(idEvento: number): Promise<void> {
  try {
    await apiPut(`/primetixapi/api/Evento/agregaHitEvento/${idEvento}`);
  } catch {
    /* ignore */
  }
}

