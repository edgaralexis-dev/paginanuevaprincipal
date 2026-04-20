/** Alineado con `User` en paginaprincipal (campos usados en sesión y tickets). */
export interface User {
  codigo: number;
  codigoPromotor: number | null;
  nombre: string;
  usuario1: string;
  correoElectronico: string;
  numeroCelular: string;
  tokenPrivado: string;
  activo: string;
  ultimaConexion?: string;
  codigoRol: number;
  rol: string;
  estadoRol: string;
  inicioSesion: string;
  finalSesion: string;
  correoVerificado: boolean;
  intentoLogin?: number;
  fechaBloqueo?: string;
  paginasAcceso?: unknown[];
  rols?: unknown[];
}
