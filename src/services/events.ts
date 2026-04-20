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

/** Listado plano (p. ej. `VerEvento` en paginaprincipal). */
export async function getEvents(): Promise<ResumeEvent[]> {
  return apiGet<ResumeEvent[]>('/primetixapi/api/Evento/ObtenerEventos');
}

/**
 * Home de paginaprincipal: `Welcome` → `getEventsByCountry` → este endpoint.
 * GET `/primetixapi/api/Evento/ObtenerEventosAgrupadosPorIdPais/{idPais}`
 */
export async function getEventsByCountryGrouped(idPais: number): Promise<ResumeEventsByCountry[]> {
  return apiGet<ResumeEventsByCountry[]>(`/primetixapi/api/Evento/ObtenerEventosAgrupadosPorIdPais/${idPais}`);
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

