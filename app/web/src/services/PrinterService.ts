import type { SaleData } from '@/types';
import { markPrinted } from './SaleService';
import { apiFetch } from '@/lib/api';

export interface PrinterStatus {
  online: boolean;
  printerConnected: boolean;
  printerName?: string;
  driver?: string;
  paperWidth?: '80mm' | '58mm';
  mode?: 'usb' | 'system' | 'simulation';
  error?: string;
}

export interface PrintOptions {
  paperWidth?: '80mm' | '58mm';
  cutPaper?: boolean;
  openDrawer?: boolean;
  businessName?: string;
  rfc?: string;
  address?: string;
  footerMessage?: string;
}

const DEFAULT_AGENT_PORT = 5001;

export function getPrinterAgentUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('pos_printer_agent_url');
    if (saved) return saved.trim().replace(/\/$/, '');
  }
  return (
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_PRINTER_URL) ||
    `http://127.0.0.1:${DEFAULT_AGENT_PORT}`
  );
}

export function setPrinterAgentUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('pos_printer_agent_url', url.trim().replace(/\/$/, ''));
  }
}

/**
 * Consulta el estado del agente de impresión local en la PC de caja.
 * Incluye fallback automático al backend local si el puerto 5001 no responde directamente.
 */
export async function checkPrinterAgentStatus(): Promise<PrinterStatus> {
  const url = `${getPrinterAgentUrl()}/status`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);

    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        online: true,
        printerConnected: Boolean(data.printerConnected ?? true),
        printerName: data.printerName || 'Impresora Térmica POS USB',
        driver: data.driver || 'ESC/POS',
        paperWidth: data.paperWidth || '58mm',
        mode: data.mode || 'usb',
      };
    }
  } catch { }

  // Fallback transparente al endpoint del backend
  try {
    const res = await apiFetch('/printer/status');
    if (res.ok) {
      const data = await res.json();
      return {
        online: true,
        printerConnected: Boolean(data.printerConnected),
        printerName: data.printerName || 'Impresora Térmica POS USB',
        driver: 'ESC/POS Direct',
        paperWidth: data.paperWidth || '58mm',
        mode: data.mode || 'usb',
      };
    }
  } catch { }

  return {
    online: false,
    printerConnected: false,
    error: 'Agente local no detectado o fuera de línea',
  };
}

/**
 * Intenta enviar el trabajo de impresión al agente local USB.
 * Si el puerto 5001 no responde, utiliza el backend como puente directo hacia la impresora USB.
 */
export async function printToLocalAgent(
  sale: SaleData,
  options?: PrintOptions,
): Promise<{ success: boolean; message: string }> {
  const url = `${getPrinterAgentUrl()}/print`;

  const payload = {
    sale,
    options: {
      paperWidth: options?.paperWidth || '58mm',
      cutPaper: options?.cutPaper ?? true,
      openDrawer: options?.openDrawer ?? false,
      businessName: options?.businessName || 'RESTAURANTE POS',
      rfc: options?.rfc || 'XAXX010101000',
      address: options?.address || 'Sucursal Principal',
      footerMessage: options?.footerMessage || '¡Gracias por su visita!',
      printedAt: new Date().toISOString(),
    },
  };

  // 1. Intentar agente local en puerto 5001
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-POS-Print-Token': 'pos-local-usb-agent',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (sale.id) {
        markPrinted(sale.id).catch(() => { });
      }
      return {
        success: true,
        message: data.message || 'Ticket impreso exitosamente en la impresora física USB',
      };
    }
  } catch (err: any) {
    // Si el agente local en 5001 no respondió, ejecutar fallback vía backend
  }

  // 2. Fallback vía backend (impresión directa en el host)
  try {
    const res = await apiFetch('/printer/print', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      if (sale.id) {
        markPrinted(sale.id).catch(() => { });
      }
      return {
        success: true,
        message: data.message || 'Ticket impreso exitosamente vía servidor',
      };
    }
    const errData = await res.json().catch(() => ({}));
    return {
      success: false,
      message: errData.message || 'Error al imprimir vía servidor',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'No fue posible contactar a la impresora física por USB',
    };
  }
}

/**
 * Genera el texto plano formateado para tickets ESC/POS o terminales monoespaciadas.
 */
export function formatTicketPlainText(sale: SaleData, width: '80mm' | '58mm' = '80mm'): string {
  const cols = width === '80mm' ? 48 : 32;
  const line = (char = '-') => char.repeat(cols);
  const center = (text: string) => {
    if (text.length >= cols) return text.slice(0, cols);
    const pad = Math.floor((cols - text.length) / 2);
    return ' '.repeat(pad) + text;
  };
  const row = (left: string, right: string) => {
    const space = Math.max(1, cols - left.length - right.length);
    return left + ' '.repeat(space) + right;
  };

  const tableNumber =
    typeof sale.table === 'object' && sale.table !== null
      ? (sale.table as any).number ?? '—'
      : String(sale.table || '—');

  const lines: string[] = [
    center('*** RESTAURANTE POS ***'),
    center('COMPROBANTE DE CONSUMO'),
    center('NO FISCAL'),
    line('='),
    row(`FOLIO: ${sale.folio || `VTA-${sale.id.slice(-6)}`}`, `MESA: ${tableNumber}`),
    row(
      `FECHA: ${new Date(sale.date || Date.now()).toLocaleDateString()}`,
      `HORA: ${new Date(sale.date || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    ),
    row(`TIPO: ${(sale.orderType || 'local').toUpperCase()}`, `PAGO: ${(sale.paymentMethod || 'efectivo').toUpperCase()}`),
    line('-'),
  ];

  if (width === '80mm') {
    lines.push('CANT  DESCRIPCIÓN                  PRECIO    IMPORTE');
  } else {
    lines.push('CANT  PRODUCTO           IMPORTE');
  }
  lines.push(line('-'));

  const items = (sale.orders ?? []).flatMap((o) => o.items ?? []);
  let subtotalCalculated = 0;

  for (const it of items) {
    const qty = it.quantity || 1;
    const price = it.price || 0;
    const total = qty * price;
    subtotalCalculated += total;

    const qtyStr = String(qty).padStart(2, ' ');
    const priceStr = `$${price.toFixed(2)}`;
    const totalStr = `$${total.toFixed(2)}`;

    if (width === '80mm') {
      const name = it.recipe.padEnd(24, ' ').slice(0, 24);
      lines.push(`${qtyStr}x  ${name}  ${priceStr.padStart(8, ' ')}  ${totalStr.padStart(8, ' ')}`);
    } else {
      const name = it.recipe.padEnd(16, ' ').slice(0, 16);
      lines.push(`${qtyStr}x ${name} ${totalStr.padStart(8, ' ')}`);
    }

    if (it.notes) {
      lines.push(`     * ${it.notes.slice(0, cols - 7)}`);
    }
  }

  lines.push(line('-'));
  const baseSubtotal = subtotalCalculated > 0 ? subtotalCalculated : (sale.totalAmount || 0);
  lines.push(row('SUBTOTAL:', `$${baseSubtotal.toFixed(2)}`));

  if (sale.discountAmount && sale.discountAmount > 0) {
    const promoName = sale.promotionApplied?.name ? ` (-${sale.promotionApplied.name})` : '';
    lines.push(row(`DESCUENTO${promoName}:`, `-$${sale.discountAmount.toFixed(2)}`));
  }

  lines.push(line('='));
  lines.push(row('TOTAL A PAGAR:', `$${(sale.totalAmount || 0).toFixed(2)}`));
  lines.push(line('='));

  lines.push(row('ESTADO DE CUENTA:', sale.status === 'paid' ? 'PAGADO (LIQUIDADO)' : 'POR COBRAR (PRE-CUENTA)'));
  lines.push('');
  lines.push(center('¡Muchas gracias por su preferencia!'));
  lines.push(center('www.mirestaurante.com'));
  lines.push('');
  lines.push('');

  return lines.join('\n');
}

/**
 * Evalúa si la impresión automática de comanda a cocina está habilitada
 * según la variable de entorno TICKET_A_COCINA (TRUE o FALSE).
 */
export function isTicketACocinaEnabled(): boolean {
  if (typeof process !== 'undefined') {
    const envVal = process.env.TICKET_A_COCINA || process.env.NEXT_PUBLIC_TICKET_A_COCINA;
    if (envVal !== undefined && envVal !== null && envVal !== '') {
      return envVal.trim().toUpperCase() === 'TRUE';
    }
  }
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('pos_ticket_a_cocina');
    if (local !== null && local !== '') {
      return local.trim().toUpperCase() === 'TRUE';
    }
  }
  return true;
}

/**
 * Envía la comanda de cocina directamente al agente de impresión USB de forma transparente.
 * Si TICKET_A_COCINA=FALSE o la impresora está fuera de línea, falla silenciosamente sin alertar ni bloquear la interfaz.
 * Separa automáticamente los platillos por estación (Cocina Fría y Cocina Caliente), generando
 * dos tickets independientes si contiene artículos de ambas, o solo el correspondiente si es exclusiva.
 */
export async function printKitchenOrderToLocalAgent(
  order: any,
  options?: PrintOptions,
): Promise<{ success: boolean; message: string }> {
  if (!isTicketACocinaEnabled()) {
    return {
      success: false,
      message: 'Impresión automática de comanda desactivada por TICKET_A_COCINA=FALSE',
    };
  }

  const items = (order.recipes || order.items || []).filter((it: any) => it.status !== 'cancelled');
  if (items.length === 0) {
    return { success: false, message: 'No hay platillos activos para imprimir' };
  }

  // Si ya viene pre-filtrado para una sola estación
  if (order.station) {
    return sendSingleStationTicket(order, options);
  }

  const coldItems = items.filter((it: any) => (it.station || it.recipe?.station) === 'fria');
  const hotItems = items.filter((it: any) => (it.station || it.recipe?.station) === 'caliente');

  const results: Array<{ success: boolean; message: string }> = [];

  if (coldItems.length > 0) {
    const coldOrder = {
      ...order,
      station: 'fria',
      stationName: 'COCINA FRÍA',
      recipes: coldItems,
      items: coldItems,
    };
    results.push(await sendSingleStationTicket(coldOrder, { ...options, station: 'fria' }));
  }

  if (hotItems.length > 0) {
    const hotOrder = {
      ...order,
      station: 'caliente',
      stationName: 'COCINA CALIENTE',
      recipes: hotItems,
      items: hotItems,
    };
    results.push(await sendSingleStationTicket(hotOrder, { ...options, station: 'caliente' }));
  }

  const allOk = results.length > 0 && results.every((r) => r.success);
  return {
    success: allOk,
    message: allOk
      ? `Comandas enviadas exitosamente (${results.length} ticket${results.length > 1 ? 's' : ''})`
      : 'Algunas comandas no pudieron ser impresas',
  };
}

async function sendSingleStationTicket(
  order: any,
  options?: PrintOptions & { station?: string },
): Promise<{ success: boolean; message: string }> {
  const url = `${getPrinterAgentUrl()}/print-kitchen`;
  const payload = {
    type: 'kitchen',
    order,
    options: {
      paperWidth: options?.paperWidth || '58mm',
      cutPaper: options?.cutPaper ?? true,
      openDrawer: false,
      station: order.station || options?.station,
      stationName: order.stationName || (order.station === 'fria' ? 'COCINA FRÍA' : 'COCINA CALIENTE'),
      printedAt: new Date().toISOString(),
    },
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-POS-Print-Token': 'pos-local-usb-agent',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: true,
        message: data.message || 'Comanda enviada a cocina exitosamente',
      };
    }
  } catch { }

  // Fallback transparente al endpoint /printer/print-kitchen del backend
  try {
    const res = await apiFetch('/printer/print-kitchen', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: true,
        message: data.message || 'Comanda enviada a cocina exitosamente vía servidor',
      };
    }
  } catch (err: any) {
    console.warn('[PrinterService] Auto-print de comanda no disponible:', err?.message);
  }

  return {
    success: false,
    message: 'Agente de impresión local fuera de línea',
  };
}

/**
 * Formatea el ticket de comanda para cocina en texto monoespaciado
 */
export function formatKitchenTicketPlainText(order: any, width: '80mm' | '58mm' = '58mm', stationTitle?: string): string {
  const cols = width === '80mm' ? 48 : 32;
  const line = (char = '-') => char.repeat(cols);
  const center = (text: string) => {
    if (text.length >= cols) return text.slice(0, cols);
    const pad = Math.floor((cols - text.length) / 2);
    return ' '.repeat(pad) + text;
  };
  const row = (left: string, right: string) => {
    const space = Math.max(1, cols - left.length - right.length);
    return left + ' '.repeat(space) + right;
  };

  const tableNum =
    order.tableNumber ??
    (typeof order.table === 'object' && order.table !== null ? order.table?.number : order.table) ??
    '—';

  const orderId = order.id || order._id || 'ORD-0000';
  const shortId = typeof orderId === 'string' && orderId.length > 6 ? orderId.slice(-6).toUpperCase() : String(orderId).toUpperCase();
  const dateStr = new Date(order.createdAt || Date.now()).toLocaleDateString('es-MX');
  const timeStr = new Date(order.createdAt || Date.now()).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  const station = stationTitle || order.stationName || (order.station === 'fria' ? 'COCINA FRÍA' : order.station === 'caliente' ? 'COCINA CALIENTE' : '');
  const titleText = station ? `*** COMANDA DE ${station.toUpperCase()} ***` : '*** COMANDA DE COCINA ***';

  const lines: string[] = [
    center('================================'),
    center(titleText),
    center('================================'),
    row(`ORDEN: #${shortId}`, `MESA: ${tableNum}`),
    ...(station ? [row(`ESTACIÓN:`, station.toUpperCase())] : []),
    row(`FECHA: ${dateStr}`, `HORA: ${timeStr}`),
  ];

  if (order.notes) {
    lines.push(line('-'));
    lines.push(`NOTAS: ${order.notes.toUpperCase()}`);
  }

  lines.push(line('='));
  lines.push(width === '80mm' ? 'CANT  PLATILLO / ESPECIFICACION' : 'CANT PLATILLO / NOTAS');
  lines.push(line('-'));

  const items = order.recipes || order.items || [];
  let totalItemsCount = 0;

  for (const it of items) {
    const qty = it.quantity || 1;
    totalItemsCount += qty;
    const name = it.name || (typeof it.recipe === 'object' && it.recipe !== null ? it.recipe?.name : it.recipe) || 'Platillo';
    const notes = it.notes || '';

    const qtyStr = `[ ${qty} ]`;
    if (width === '80mm') {
      lines.push(`${qtyStr.padEnd(6, ' ')} ${name.toUpperCase()}`);
    } else {
      lines.push(`${qtyStr.padEnd(5, ' ')} ${name.toUpperCase()}`);
    }

    if (notes) {
      lines.push(`      >> ${notes}`);
    }
  }

  lines.push(line('-'));
  lines.push(row('TOTAL PLATILLOS:', `${totalItemsCount} pzas`));
  lines.push(line('='));
  lines.push(center('--- ENVIADO A COCINA ---'));
  lines.push('');
  lines.push('');

  return lines.join('\n');
}
