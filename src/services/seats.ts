import { apiGet, apiPut, apiPutJsonAnyStatus } from './apiClient';

export type SeatMap = {
  codigo: number;
  nombre: string;
  estadoAsiento: string;
  codigoMesa: number;
  codigoSector: number;
  nombreSector: string;
  codigoLocalidad: number;
  nombreLocalidad: string;
  precio: number;
  fee: number;
  precioEspecial: number;
  estadoLocalidad: string;
  colorHexa?: string;
};

export type SeatMapPie = SeatMap & {
  cantidadMaximaEspacios?: number;
  cantidadUtilizada?: number;
  asientosDisponibles?: number;
  disponibilidad?: number;
};

export type ReservaBody = {
  codigoAsiento: number;
  uuid: string;
  cantidad: number;
  esPie: boolean;
  codigoTicket: number;
  fechaReserva: string;
  socketId: string;
};

export async function getSeatsMap(eventId: number): Promise<SeatMap[]> {
  try {
    return await apiGet<SeatMap[]>(`/primetixapi/api/Asiento/ObtieneAsientoPorIdEvento/${eventId}`);
  } catch {
    return [];
  }
}

export async function getSeatPieMap(eventId: number): Promise<SeatMapPie[]> {
  try {
    return await apiGet<SeatMapPie[]>(`/primetixapi/api/Asiento/ObtenerAsientoDePiePorIdEvento/${eventId}`);
  } catch {
    return [];
  }
}

export async function reservarAsiento(
  reservar: boolean,
  body: ReservaBody,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  return apiPutJsonAnyStatus(`/primetixapi/api/Asiento/ReservaAsiento/${reservar}`, body);
}

export async function getAsientosReservado(uuid: string, codigoEvento: number): Promise<SeatMap[]> {
  try {
    return await apiGet<SeatMap[]>(
      `/primetixapi/api/Asiento/ObtieneAsientoReservadosPorUuid?socketId=${encodeURIComponent(uuid)}&codigoEvento=${codigoEvento}`,
    );
  } catch {
    return [];
  }
}

export async function quitarReservasPorUuid(
  uuid: string,
  codigoEvento: number,
): Promise<{ ok: boolean; status?: number }> {
  try {
    await apiPut(`/primetixapi/api/Asiento/QuitarReservas/${encodeURIComponent(uuid)}?codigoEvento=${codigoEvento}`);
    return { ok: true };
  } catch (e) {
    const status = typeof e === 'object' && e && 'status' in e ? Number((e as { status?: number }).status) : undefined;
    return { ok: false, status };
  }
}
