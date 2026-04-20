import { getApiBaseUrl } from './apiClient';
import type { ResumeTickets, TicketEventos, TicketPorId, TicketTix } from '../types/tickets';

export type ResumeTicketHistorial = {
  codigoTicket: number;
  estado: string;
  nombreEstado: string;
  descripcionEstado: string;
  fecha: string;
};

/** Mismo endpoint que paginaprincipal `getTickets`. */
export async function getTicketsByUser(
  idUsuario: number,
  token: string,
): Promise<ResumeTickets | { response: string }> {
  const base = getApiBaseUrl();
  const path = `/tickettixapi/api/Ticket/ObtieneTicketPorUsuario?idUsuario=${idUsuario}`;
  const url = `${base}${path}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await res.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
  }

  if (typeof data === 'object' && data !== null && (data as { response?: string }).response === 'SinJWT') {
    return { response: 'SinJWT' };
  }

  if (!res.ok) {
    return { eventos: [], response: `HTTP_${res.status}` };
  }

  return data as ResumeTickets;
}

/** Mismo endpoint que paginaprincipal `getHistory`. */
export async function getTicketHistoryByUser(
  idUsuario: number,
  token: string,
): Promise<ResumeTicketHistorial[] | { response: string }> {
  const base = getApiBaseUrl();
  const path = `/tickettixapi/api/Ticket/ObtieneTicketHistorialPorIdUsuario?idUsuario=${idUsuario}`;
  const url = `${base}${path}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await res.text();
  let data: unknown = [];
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = [];
    }
  }

  if (typeof data === 'object' && data !== null && (data as { response?: string }).response === 'SinJWT') {
    return { response: 'SinJWT' };
  }
  if (!res.ok) return { response: `HTTP_${res.status}` };
  return Array.isArray(data) ? (data as ResumeTicketHistorial[]) : [];
}

/** Eventos futuros con tickets no transferidos (lógica simplificada de UserTicket). */
export function filterUpcomingTickets(raw: ResumeTickets): TicketEventos[] {
  const eventos = Array.isArray(raw.eventos) ? raw.eventos : [];
  const hoy = new Date();
  const out: TicketEventos[] = [];

  for (const item of eventos) {
    const fin = item.fechaEventoFin ? new Date(item.fechaEventoFin) : null;
    if (fin && fin <= hoy) continue;

    const tickets = (item.tickets ?? []).filter((t: TicketTix) => t.estado !== 'TI');
    if (tickets.length === 0) continue;

    out.push({
      ...item,
      tickets: [...tickets].sort((a, b) => b.codigo - a.codigo),
    });
  }

  return out.sort((a, b) => new Date(a.fechaEvento).getTime() - new Date(b.fechaEvento).getTime());
}

/** Eventos pasados (fecha fin <= hoy) con tickets no transferidos. */
export function filterPastTickets(raw: ResumeTickets): TicketEventos[] {
  const eventos = Array.isArray(raw.eventos) ? raw.eventos : [];
  const hoy = new Date();
  const out: TicketEventos[] = [];

  for (const item of eventos) {
    const fin = item.fechaEventoFin ? new Date(item.fechaEventoFin) : null;
    if (!fin || fin > hoy) continue;

    const tickets = (item.tickets ?? []).filter((t: TicketTix) => t.estado !== 'TI');
    if (tickets.length === 0) continue;

    out.push({
      ...item,
      tickets: [...tickets].sort((a, b) => b.codigo - a.codigo),
    });
  }

  return out.sort((a, b) => new Date(b.fechaEvento).getTime() - new Date(a.fechaEvento).getTime());
}

/** Mismo endpoint que paginaprincipal `getTicketsPorId`. */
export async function getTicketById(
  idTicket: number,
  token: string,
): Promise<TicketPorId | { response: string }> {
  const base = getApiBaseUrl();
  const path = `/tickettixapi/api/Ticket/ObtieneTicketPorId?id=${idTicket}`;
  const url = `${base}${path}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await res.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
  }

  if (typeof data === 'object' && data !== null && (data as { response?: string }).response === 'SinJWT') {
    return { response: 'SinJWT' };
  }

  if (!res.ok) {
    return { response: `HTTP_${res.status}` };
  }

  return data as TicketPorId;
}

/** Mismo endpoint que paginaprincipal `cancelarTranferencia`. */
export async function cancelTransfer(
  idTicket: number,
  idUsuarioEnvia: number,
  token: string,
): Promise<{ ok: boolean; response?: string }> {
  const base = getApiBaseUrl();
  const path = `/tickettixapi/api/Ticket/CancelarTransferencia?idTicket=${idTicket}&idUsuarioEnvia=${idUsuarioEnvia}`;
  const url = `${base}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const text = await res.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
  }
  if (typeof data === 'object' && data !== null && (data as { response?: string }).response === 'SinJWT') {
    return { ok: false, response: 'SinJWT' };
  }
  return { ok: res.ok, response: (data as { response?: string }).response };
}

/** Mismo endpoint que paginaprincipal `cancelarReventa`. */
export async function cancelResale(
  idTicket: number,
  token: string,
): Promise<{ ok: boolean; response?: string }> {
  const base = getApiBaseUrl();
  const path = `/tickettixapi/api/Ticket/CancelarReventa?idTicket=${idTicket}`;
  const url = `${base}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const text = await res.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
  }
  if (typeof data === 'object' && data !== null && (data as { response?: string }).response === 'SinJWT') {
    return { ok: false, response: 'SinJWT' };
  }
  return { ok: res.ok, response: (data as { response?: string }).response };
}

export type TicketTimelineItem = {
  fecha?: string;
  descripcion?: string;
  detalle?: string;
  estado?: string;
  [k: string]: unknown;
};

/** Mismo endpoint que paginaprincipal `HistorialTimeline`. */
export async function getTicketTimeline(
  codigoUsuario: number,
  codigoTicket: number,
  token: string,
): Promise<TicketTimelineItem[] | { response: string }> {
  const base = getApiBaseUrl();
  const path = `/tickettixapi/api/Ticket/ObtieneTicketTracking?CodigoUsuario=${codigoUsuario}&CodigoTicket=${codigoTicket}`;
  const url = `${base}${path}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await res.text();
  let data: unknown = [];
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = [];
    }
  }

  if (typeof data === 'object' && data !== null && (data as { response?: string }).response === 'SinJWT') {
    return { response: 'SinJWT' };
  }
  if (!res.ok) return { response: `HTTP_${res.status}` };
  return Array.isArray(data) ? (data as TicketTimelineItem[]) : [];
}
