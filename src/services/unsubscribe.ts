import { apiPostJsonAnyStatus } from './apiClient';

export async function unsubscribeUserNotifications(codigoUsuario: string): Promise<boolean> {
  const id = (codigoUsuario || '').trim();
  if (!id) return false;
  const { ok } = await apiPostJsonAnyStatus<Record<string, unknown>>(
    `/securetixapi/api/usuario/DesuscribeUsuarioNotificaionesCorreo?CodigoUsuario=${encodeURIComponent(id)}`,
    {},
  );
  return ok;
}
