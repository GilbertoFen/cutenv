export function isAllowedOrigin(origin: string | undefined): boolean {
  // Peticiones sin origin (curl, mobile apps, electron file://, same-origin)
  if (!origin) return true;

  // Localhost / Loopback en cualquier puerto
  if (
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:') ||
    origin.startsWith('https://localhost:') ||
    origin.startsWith('https://127.0.0.1:')
  ) {
    return true;
  }

  // Red de área local (RFC 1918) para tablets y dispositivos en la LAN
  if (
    /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(
      origin
    )
  ) {
    return true;
  }

  // Origen configurado explícitamente en variables de entorno
  if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
    return true;
  }

  return false;
}

export const corsOptionsDelegate = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  if (isAllowedOrigin(origin)) {
    callback(null, true);
  } else {
    callback(new Error(`CORS blocked for origin: ${origin}`));
  }
};
