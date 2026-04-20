export type ApiError = {
  message: string;
  status?: number;
  url?: string;
};

export function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_URL_API as string | undefined;
  // En localhost usamos rutas relativas para que el proxy de Vite maneje CORS
  // tanto en `dev` como en `preview`.
  if (typeof window !== 'undefined') {
    const h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0') return '';
  }
  return envUrl || '';
}

function getBaseUrl() {
  return getApiBaseUrl();
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getBaseUrl();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  const res = await fetch(url, {
    method: 'GET',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const err: ApiError = { message: `HTTP ${res.status}`, status: res.status, url };
    throw err;
  }

  return (await res.json()) as T;
}

export async function apiGetAuth<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const base = getBaseUrl();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  const res = await fetch(url, {
    method: 'GET',
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const err: ApiError = { message: `HTTP ${res.status}`, status: res.status, url };
    throw err;
  }

  return (await res.json()) as T;
}

export async function apiPostJson<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  const base = getBaseUrl();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  const res = await fetch(url, {
    method: 'POST',
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err: ApiError = { message: `HTTP ${res.status}`, status: res.status, url };
    throw err;
  }

  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

export async function apiPut(path: string, init?: RequestInit): Promise<void> {
  const base = getBaseUrl();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  await fetch(url, {
    method: 'PUT',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}

/** POST donde 400/401 pueden traer cuerpo JSON útil (login). */
export async function apiPostJsonAnyStatus<T>(path: string, body: unknown, init?: RequestInit): Promise<{
  ok: boolean;
  status: number;
  data: T;
}> {
  const base = getBaseUrl();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  const res = await fetch(url, {
    method: 'POST',
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data = {} as T;
  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = {} as T;
    }
  }
  return { ok: res.ok, status: res.status, data };
}

