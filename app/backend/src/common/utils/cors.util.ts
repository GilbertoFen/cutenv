export function isAllowedOrigin(origin: string | undefined): boolean {
  // Peticiones sin origin (curl, mobile apps, electron file://, same-origin, SSR)
  if (!origin) return true;

  const cleanOrigin = origin.trim().replace(/\/+$/, '');

  // Localhost / Loopback en cualquier puerto
  if (
    cleanOrigin.startsWith('http://localhost:') ||
    cleanOrigin.startsWith('http://127.0.0.1:') ||
    cleanOrigin.startsWith('https://localhost:') ||
    cleanOrigin.startsWith('https://127.0.0.1:') ||
    cleanOrigin === 'http://localhost' ||
    cleanOrigin === 'http://127.0.0.1'
  ) {
    return true;
  }

  // Red de área local (RFC 1918) para tablets y dispositivos en la LAN
  if (
    /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(
      cleanOrigin
    )
  ) {
    return true;
  }

  // Permitir dominios de Vercel (*.vercel.app) automáticamente
  if (
    cleanOrigin.endsWith('.vercel.app') ||
    cleanOrigin.includes('.vercel.app')
  ) {
    return true;
  }

  // Origen(es) configurado(s) explícitamente en variables de entorno (soporta múltiples separados por coma)
  const envFrontend = process.env.FRONTEND_URL;
  if (envFrontend) {
    const allowed = envFrontend
      .split(',')
      .map((u) => u.trim().replace(/\/+$/, ''))
      .filter(Boolean);

    if (allowed.some((u) => cleanOrigin === u || cleanOrigin.startsWith(u))) {
      return true;
    }
  }

  return false;
}

export const corsOptionsDelegate = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  callback(null, isAllowedOrigin(origin));
};
