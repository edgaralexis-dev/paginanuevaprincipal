import { apiPostJsonAnyStatus } from './apiClient';

export type VentaDetallePayload = {
  codigo: number;
  reventa: boolean;
  codigoAsiento: number;
  cantidad: number;
  precioUnitario: number;
  codigoTicket: number;
};

export type RegisterOrderPayload = {
  codigo: number;
  codigoEmpresa: number;
  codigoPago: number;
  codigoCliente: number;
  codigoDescuento: number | null;
  codigoEvento: number;
  descuento: number;
  serviceFee: number;
  total: number;
  estado: string;
  correoElectronico: string;
  numeroCelular: string;
  nombreCliente: string;
  codigoCanal: number;
  tokenDescuento: string;
  idTributario: string;
  nombreTributario: string;
  ventaDetalles: VentaDetallePayload[];
};

export type RegisterOrderResponse = {
  respuesta?: string;
  response?: string;
  checkout_url?: string;
  url?: string;
  redirectUrl?: string;
  pago?: {
    detalle?: string;
  };
};

/** Crea orden en estado pendiente para que el webhook pueda asociar pago/venta. */
export async function registerOrder(
  body: RegisterOrderPayload,
  token: string,
): Promise<{ ok: boolean; status: number; data: RegisterOrderResponse }> {
  return apiPostJsonAnyStatus<RegisterOrderResponse>(
    '/paymenttixapi/api/Venta/RegistrarOrden',
    body,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

/** Replica helper legacy para trazabilidad de errores de venta. */
export async function saveSaleError(codigo: number, json: string): Promise<void> {
  const encoded = encodeURIComponent(json);
  await apiPostJsonAnyStatus(
    `/paymenttixapi/api/Venta/GuardarErrorVenta?codigo=${codigo}&json=${encoded}`,
    {},
  );
}

/** Registra venta tras confirmación de pago (mismo endpoint que paginaprincipal `registerSale`). */
export async function registerSale(
  body: RegisterOrderPayload,
  token: string,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  return apiPostJsonAnyStatus<unknown>('/paymenttixapi/api/Venta/RegistraVenta', body, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
