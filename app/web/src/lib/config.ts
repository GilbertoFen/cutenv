/**
 * Configuración centralizada para API REST y Socket.IO en Next.js.
 * Resuelve automáticamente la IP de la computadora principal cuando
 * clientes de la red local (tablets, celulares, otras PC) se conectan.
 */

export function getBackendBaseUrl(): string {
  // 1. Si está explícitamente configurada en variables de entorno públicas
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }

  // 2. Si estamos en el navegador, deducir la IP/hostname de la computadora host
  if (typeof window !== 'undefined' && window.location) {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    // El backend NestJS corre por defecto en el puerto 3001
    return `${protocol}//${hostname}:3001`;
  }

  // 3. Si estamos en el servidor (SSR / Server Component)
  if (typeof process !== 'undefined' && process.env?.BACKEND_INTERNAL_URL) {
    return process.env.BACKEND_INTERNAL_URL.replace(/\/+$/, '');
  }

  return 'http://127.0.0.1:3001';
}

export function getSocketBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL.replace(/\/+$/, '');
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
