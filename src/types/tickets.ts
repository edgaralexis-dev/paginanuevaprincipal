export interface TicketTix {
  codigo: number;
  codigoAsiento: number;
  codigoUsuario: number;
  asiento: string;
  localidad: string;
  codigoTipoLocalidad: number;
  precio: number;
  fecha: string;
  estado: string;
  codigoVenta: number;
  fisico: boolean;
  cortesia: boolean;
  serialNumber?: string;
  escaneos?: number;
  usuarioTransferencia?: string;
  codigoAutorizacion?: number;
}

export interface TicketEventos {
  codigoEvento: number;
  evento: string;
  artista: string;
  fechaEvento: string;
  fechaEventoFin: string;
  aplicaWallet: boolean;
  aplicaReventa: boolean;
  aplicaTransferencia: boolean;
  imagenEvento: string;
  tickets: TicketTix[];
}

export interface ResumeTickets {
  codigoUsuario?: number;
  eventos: TicketEventos[];
  response?: string;
}

export interface TicketPorId {
  codigo: number;
  codigoEvento: number;
  artista: string;
  imagenEvento: string;
  fechaEvento: string;
  asiento: string;
  localidad: string;
  estado: string;
  precio: number;
  serviceFee: number;
  simboloMoneda?: string;
  aplicaWallet?: boolean;
  fisico?: boolean;
  serialNumber?: string | null;
  response?: string;
}
