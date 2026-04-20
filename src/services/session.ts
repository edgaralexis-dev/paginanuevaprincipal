import { apiGet, apiPostJsonAnyStatus } from './apiClient';
import type { User } from '../types/user';

const CODIGO_PAIS = 1;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** GET usuario por correo o número (mismo contrato que paginaprincipal). */
export async function getUser(email?: string, phone?: string): Promise<User | null> {
  let param = `correoElectronico=${encodeURIComponent(normalizeEmail(email ?? ''))}`;
  if (!email && phone) {
    param = `numeroCelular=${encodeURIComponent(phone)}`;
  }
  try {
    // En el legacy usan `.toLowerCase()` sobre todo el querystring.
    const u = await apiGet<User>(`/securetixapi/api/usuario/ObtieneUsuario?${param.toLowerCase()}`);
    return u?.codigo ? u : null;
  } catch {
    return null;
  }
}

/** Envía contraseña / OTP temporal (WhatsApp o correo). */
export async function generatePassword(email?: string, numeroCelular?: string): Promise<Partial<User>> {
  let qs = '';
  if (email) {
    qs = `correoElectronico=${encodeURIComponent(normalizeEmail(email))}&codigoPais=${CODIGO_PAIS}`;
  } else if (numeroCelular) {
    qs = `numeroCelular=${encodeURIComponent(numeroCelular)}&codigoPais=${CODIGO_PAIS}`;
  } else {
    return {};
  }
  const { ok, data } = await apiPostJsonAnyStatus<Partial<User>>(
    `/securetixapi/api/Login/GeneraContrasenaTemporal?${qs}`,
    {},
  );
  return ok ? data : {};
}

export interface LoginResult {
  success: boolean;
  user?: User;
  message?: string;
  intentosLogin?: number;
  status?: number;
}

function pickUser(data: Record<string, unknown>): User | undefined {
  if (data?.tokenPrivado && data?.codigo) {
    return data as unknown as User;
  }
  const nested = data.usuario;
  if (nested && typeof nested === 'object' && (nested as User).tokenPrivado && (nested as User).codigo) {
    return nested as User;
  }
  const vals = Object.values(data);
  for (const v of vals) {
    if (v && typeof v === 'object' && (v as User).tokenPrivado && (v as User).codigo) {
      return v as User;
    }
  }
  return undefined;
}

function pickMessage(data: Record<string, unknown>): string | undefined {
  const candidates: unknown[] = [
    (data as any).respuesta,
    (data as any).message,
    (data as any).mensaje,
    (data as any).error,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c;
  }
  return undefined;
}

/** Valida OTP/contraseña temporal (ValidaContrasenaLoginPrimetix). */
export async function loginPrimetix(
  correo: string | undefined,
  contrasena: string,
  uuid: string,
  numeroCelular: string | undefined,
): Promise<LoginResult> {
  const { ok, status, data } = await apiPostJsonAnyStatus<Record<string, unknown>>(
    `/securetixapi/api/Login/ValidaContrasenaLoginPrimetix`,
    // Importante: en paginaprincipal mandan `correoElectronico`/`numeroCelular` tal cual,
    // y si no aplica, queda `undefined` (no string vacío).
    {
      correoElectronico: correo ? normalizeEmail(correo) : undefined,
      contrasena,
      uuid,
      numeroCelular: numeroCelular || undefined,
    },
  );

  const intentosLogin = (data as { intentosLogin?: number }).intentosLogin;
  if (typeof intentosLogin === 'number' && intentosLogin >= 3) {
    return { success: false, intentosLogin, message: 'Demasiados intentos', status };
  }

  const user = pickUser(data);
  if (user) {
    // En el legacy a veces viene un "exitoso" + "usuario" aunque el status no sea 2xx.
    return { success: true, user, status };
  }

  if (!ok && status === 400) {
    return { success: false, message: pickMessage(data) ?? 'Código incorrecto o expirado', intentosLogin, status };
  }

  return {
    success: false,
    message: pickMessage(data) ?? `No se pudo iniciar sesión (HTTP ${status})`,
    intentosLogin,
    status,
  };
}
