/**
 * Guatemala = 1 por defecto. Evita 0 (p. ej. VITE_CODIGO_PAIS vacío en CI → Number("") === 0).
 */
export function normalizeIdPais(value: number | string | undefined | null): number {
  if (value === undefined || value === null) return 1;
  const raw = String(value).trim();
  if (!raw) return 1;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}
