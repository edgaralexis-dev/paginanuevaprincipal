import { apiGet, apiPostJson } from './apiClient';

export type LinkPagoSeat = {
  codigoAsiento: number;
  nombre: string;
  precio: number;
  fee: number;
  reventa: boolean;
  codigoTicket: number;
  esPie: boolean;
};

export type LinkPagoUrl = {
  codigoUrl: number;
  codigoEvento: number;
  codigoPromotor: number;
  correo: string;
  numero: string;
  estado: string;
  detalles: LinkPagoSeat[];
};

export type LinkPagoEncryptedResponse = {
  url: LinkPagoUrl;
  token: string;
};

export async function getLinkPagoHeaderFromEncryptedData(
  datosEncriptados: string,
): Promise<LinkPagoEncryptedResponse | null> {
  const d = (datosEncriptados || '').trim();
  if (!d) return null;
  try {
    return await apiPostJson<LinkPagoEncryptedResponse>(
      `/dashboardapi/api/UrlEncabezado/ObtenerUrlEncabezadoDesdeDatosEncriptados?DatosEncriptados=${encodeURIComponent(d)}`,
      {},
    );
  } catch {
    return null;
  }
}
