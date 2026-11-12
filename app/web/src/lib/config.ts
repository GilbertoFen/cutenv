/**
 * Configuración centralizada para API REST y Socket.IO en Next.js.
 * Resuelve automáticamente la IP de la computadora principal cuando
 * clientes de la red local (tablets, celulares, otras PC) se conectan.
 */

function normalizeUrl(url: string | undefined): string | null {
  if (!url) return null;
  let clean = url.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');
  if (!clean) return null;
  if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('/')) {
    clean = `https://${clean}`;
  }
  return clean;
}

export function getBackendBaseUrl(): string {
  // 1. Si está explícitamente configurada en variables de entorno públicas
  const publicApi = normalizeUrl(typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_API_URL : undefined);
  if (publicApi) {
    return publicApi;
  }

  // 2. Si estamos en el navegador, deducir la IP/hostname de la computadora host
  if (typeof window !== 'undefined' && window.location) {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    // El backend NestJS corre por defecto en el puerto 3001
    return `${protocol}//${hostname}:3001`;
  }

  // 3. Si estamos en el servidor (SSR / Server Component)
  const internalUrl = normalizeUrl(typeof process !== 'undefined' ? process.env?.BACKEND_INTERNAL_URL : undefined);
  if (internalUrl) {
    return internalUrl;
  }

  return 'http://127.0.0.1:3001';
}

export function getSocketBaseUrl(): string {
  const wsUrl = normalizeUrl(typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_WS_URL : undefined);
  if (wsUrl) {
    return wsUrl;
  }
  return getBackendBaseUrl();
}

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  // En el cliente, usar la ruta relativa /api/... para aprovechar el proxy de Next.js
  if (typeof window !== 'undefined') {
    return cleanPath.startsWith('/api') ? cleanPath : `/api${cleanPath}`;
  }
  // En SSR/servidor, llamar directamente al backend
  const base = getBackendBaseUrl();
  return `${base}${cleanPath.startsWith('/api') ? cleanPath : `/api${cleanPath}`}`;
}
