import { io, Socket } from 'socket.io-client';
import { getSocketBaseUrl } from '@/lib/config';
import { getClientOperatingSchedule } from '@/utils/operatingSchedule';

export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

export interface ConnectionStateDetail {
  status: ConnectionStatus;
  attempt: number;
  maxAttempts: number;
  namespace?: string;
  error?: string;
  isOperating: boolean;
  localTime: string;
}

// Registro global de instancias de socket para evitar duplicados
const socketRegistry = new Map<string, Socket>();

// Estado consolidado de conexión
let globalStatus: ConnectionStatus = 'connecting';
let currentAttempt = 0;
const MAX_RECONNECT_ATTEMPTS = 25;
const OFF_HOURS_MAX_ATTEMPTS = 3;

// Callbacks de reconexión por socket para recuperar salas limpiamente sin duplicados
const reconnectHandlers = new Map<string, Set<() => void>>();

// Registrar actividad del usuario para reanudar reconexión si estaba en reposo
let userActivityListenersAttached = false;

function broadcastStatus(detail: Partial<ConnectionStateDetail>) {
  if (typeof window === 'undefined') return;

  const schedule = getClientOperatingSchedule();
  const fullDetail: ConnectionStateDetail = {
    status: globalStatus,
    attempt: currentAttempt,
    maxAttempts: schedule.isOperating ? MAX_RECONNECT_ATTEMPTS : OFF_HOURS_MAX_ATTEMPTS,
    isOperating: schedule.isOperating,
    localTime: schedule.localTime,
    ...detail,
  };

  window.dispatchEvent(new CustomEvent('pos:connection-status', { detail: fullDetail }));
}

function updateAggregatedStatus() {
  const sockets = Array.from(socketRegistry.values());
  if (sockets.length === 0) {
    globalStatus = 'connected';
    broadcastStatus({ status: globalStatus, attempt: 0 });
    return;
  }

  const hasReconnecting = sockets.some((s) => !s.connected && (s.io as any)?._reconnecting);
  const allConnected = sockets.every((s) => s.connected);

  if (allConnected) {
    globalStatus = 'connected';
    currentAttempt = 0;
  } else if (hasReconnecting || currentAttempt > 0) {
    globalStatus = 'reconnecting';
  } else {
    globalStatus = 'disconnected';
  }

  broadcastStatus({ status: globalStatus, attempt: currentAttempt });
}

function setupUserActivityListeners() {
  if (userActivityListenersAttached || typeof window === 'undefined') return;
  userActivityListenersAttached = true;

  const handleUserActivity = () => {
    // Si algún socket está desconectado y el usuario interactúa, intentar reconectar de inmediato
    const disconnectedSockets = Array.from(socketRegistry.values()).filter((s) => !s.connected);
    if (disconnectedSockets.length > 0) {
      console.log('[SocketManager] Actividad real de usuario detectada; verificando reconexión...');
      disconnectedSockets.forEach((s) => {
        if (!s.connected) {
          s.connect();
        }
      });
    }
  };

  window.addEventListener('click', handleUserActivity, { passive: true });
  window.addEventListener('keydown', handleUserActivity, { passive: true });
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      handleUserActivity();
    }
  });
}

/**
 * Obtiene o inicializa de forma segura un socket administrado por namespace.
 * Garantiza instancia única, reintentos con exponential backoff y logs limpios.
 */
export function getManagedSocket(namespace: string, authToken?: string): Socket {
  const normalizedNs = namespace.startsWith('/') ? namespace : `/${namespace}`;
  const existing = socketRegistry.get(normalizedNs);

  if (existing) {
    if (authToken && (!existing.auth || (existing.auth as any).token !== authToken)) {
      existing.auth = { token: authToken };
      if (!existing.connected) {
        existing.connect();
      }
    }
    return existing;
  }

  const base = getSocketBaseUrl();
  const socketUrl = `${base}${normalizedNs}`;
  const schedule = getClientOperatingSchedule();

  console.log(
    `[WS ${normalizedNs}] Inicializando conexión Socket.IO hacia ${socketUrl} | Horario operativo: ${
      schedule.isOperating ? 'ACTIVO' : 'FUERA DE HORARIO'
    } (Hora MX: ${schedule.localTime})`
  );

  setupUserActivityListeners();

  const socket = io(socketUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0.5,
    timeout: 20000,
    withCredentials: true,
    auth: authToken ? { token: authToken } : undefined,
  });

  socketRegistry.set(normalizedNs, socket);

  // 1. Conexión exitosa
  socket.on('connect', () => {
    console.log(`[WS ${normalizedNs}] Conectado exitosamente con ID: ${socket.id}`);
    currentAttempt = 0;
    updateAggregatedStatus();

    // Ejecutar re-suscripciones a salas registradas
    const handlers = reconnectHandlers.get(normalizedNs);
    if (handlers && handlers.size > 0) {
      console.log(`[WS ${normalizedNs}] Re-ejecutando ${handlers.size} suscripciones a salas tras reconexión.`);
      handlers.forEach((fn) => {
        try {
          fn();
        } catch (e) {
          console.warn(`[WS ${normalizedNs}] Error en handler de re-suscripción:`, e);
        }
      });
    }
  });

  // 2. Desconexión
  socket.on('disconnect', (reason) => {
    console.warn(`[WS ${normalizedNs}] Desconectado del backend. Motivo: ${reason}`);
    updateAggregatedStatus();
  });

  // 3. Error de conexión
  socket.on('connect_error', (err) => {
    console.warn(`[WS ${normalizedNs}] Error de conexión: ${err.message}`);
    updateAggregatedStatus();
  });

  // 4. Intentos de reconexión vía Manager
  const manager = socket.io;

  manager.on('reconnect_attempt', (attempt: number) => {
    currentAttempt = attempt;
    const currentSchedule = getClientOperatingSchedule();

    console.log(
      `[WS ${normalizedNs}] Intento de reconexión #${attempt}/${
        currentSchedule.isOperating ? MAX_RECONNECT_ATTEMPTS : OFF_HOURS_MAX_ATTEMPTS
      } en progreso...`
    );

    // Fuera de horario operativo: limitar reintentos continuos para permitir que Render suspenda
    if (!currentSchedule.isOperating && attempt >= OFF_HOURS_MAX_ATTEMPTS) {
      console.log(
        `[WS ${normalizedNs}] Fuera de horario operativo (${currentSchedule.localTime}). Pausando reconexiones automáticas continuas para respetar suspensión del backend.`
      );
      // Pausar hasta interacción del usuario
      (socket.io as any).skipReconnect = true;
    }

    updateAggregatedStatus();
  });

  manager.on('reconnect', (attempt: number) => {
    console.log(`[WS ${normalizedNs}] Reconexión exitosa al backend tras ${attempt} intentos.`);
    currentAttempt = 0;
    updateAggregatedStatus();
  });

  manager.on('reconnect_failed', () => {
    console.error(`[WS ${normalizedNs}] Límite máximo de intentos de reconexión alcanzado.`);
    updateAggregatedStatus();
  });

  return socket;
}

/**
 * Registra una acción que debe re-ejecutarse automáticamente cada vez que el socket
 * se conecta o reconecta (por ejemplo unirse a salas 'joinKitchen', 'joinReception', 'joinTable').
 *
 * Evita registrar listeners duplicados al desmontar o re-renderizar componentes.
 */
export function registerRoomOnConnect(
  socket: Socket,
  namespace: string,
  handler: () => void
): () => void {
  const normalizedNs = namespace.startsWith('/') ? namespace : `/${namespace}`;
  if (!reconnectHandlers.has(normalizedNs)) {
    reconnectHandlers.set(normalizedNs, new Set());
  }

  const set = reconnectHandlers.get(normalizedNs)!;
  set.add(handler);

  // Si ya está conectado actualmente, ejecutar de inmediato
  if (socket.connected) {
    try {
      handler();
    } catch (e) {
      console.warn(`[WS ${normalizedNs}] Error en suscripción inmediata:`, e);
    }
  }

  // Devolver función de limpieza
  return () => {
    set.delete(handler);
  };
}

/**
 * Forzar reconexión inmediata de todos los sockets registrados (por ejemplo al pulsar "Reintentar").
 */
export function reconnectAllSockets(): void {
  console.log('[SocketManager] Forzando reconexión inmediata de todos los sockets...');
  socketRegistry.forEach((socket, ns) => {
    if (!socket.connected) {
      console.log(`[WS ${ns}] Reconectando socket manualmente...`);
      socket.connect();
    }
  });
}

/**
 * Consulta el estado actual consolidado de la conexión.
 */
export function getGlobalConnectionState(): {
  status: ConnectionStatus;
  attempt: number;
} {
  return {
    status: globalStatus,
    attempt: currentAttempt,
  };
}

