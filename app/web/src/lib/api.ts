import { getApiUrl } from './config';

export const AUTH_TOKEN_KEY = 'pos_auth_token';
export const AUTH_USER_KEY = 'pos_auth_user';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Claves directas de token
  const directToken =
    localStorage.getItem(AUTH_TOKEN_KEY) ||
    sessionStorage.getItem(AUTH_TOKEN_KEY) ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('token') ||
    localStorage.getItem('pos_worker_token') ||
    sessionStorage.getItem('pos_worker_token');

  if (directToken) return directToken;

  // 2. Extraer token si se guardó dentro del objeto de usuario
  const userKeys = ['pos_admin_user', 'pos_worker_user', 'pos_user', 'pos_auth_user'];
  for (const key of userKeys) {
    try {
      const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const extracted = parsed?.token || parsed?.access_token || parsed?.workerToken;
        if (extracted && typeof extracted === 'string') {
          // Auto-guardar en la clave estándar
          try {
            localStorage.setItem(AUTH_TOKEN_KEY, extracted);
          } catch (_) {}
          return extracted;
        }
      }
    } catch (_) {}
  }

  return null;
}

export function setAuthToken(token: string, persistInSessionOnly: boolean = false): void {
  if (typeof window === 'undefined') return;
  if (persistInSessionOnly) {
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } else {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem('token');
  localStorage.removeItem('pos_worker_token');
}

/**
 * Cliente HTTP unificado con inyección automática de Bearer JWT y
 * manejo centralizado de 401 Unauthorized y 403 Forbidden.
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url =
    path.startsWith('http://') || path.startsWith('https://')
      ? path
      : path.startsWith('/api')
      ? path
      : getApiUrl(path);

  const headers = new Headers(options.headers || {});

  // Inyectar token JWT si no está presente en la petición
  const token = getAuthToken();
  if (token && !headers.has('Authorization') && !headers.has('authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Predefinir JSON en peticiones con cuerpo si no se especificó Content-Type
  if (options.body && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    credentials: options.credentials || 'include',
    ...options,
    headers,
  });

  // Manejo de expiración o token inválido (401)
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('pos:auth-unauthorized', {
          detail: { path, status: 401 },
        })
      );
    }
  }

  // Manejo de acceso prohibido por rol (403)
  if (response.status === 403) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('pos:auth-forbidden', {
          detail: { path, status: 403 },
        })
      );
    }
  }

  return response;
}
