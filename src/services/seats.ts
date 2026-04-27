import { apiGet } from './apiClient';

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
