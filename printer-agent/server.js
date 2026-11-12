/**
 * Microservicio Agente de Impresión Local USB para POS (ESC/POS)
 * Diseñado para ejecutarse en la computadora principal del restaurante.
 * 
 * Características:
 * - Puerto por defecto: 5001
 * - Compatible con Windows, macOS y Linux
 * - Detección automática de impresoras térmicas USB (ESC/POS)
 * - Protección contra impresiones duplicadas por reintentos de red
 * - Modo Simulación si la impresora no está conectada físicamente
 * - Sin dependencias externas (usa librerías nativas de Node.js)
 */

const http = require('http');
const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PRINTER_AGENT_PORT || 5001;
const HOST = process.env.PRINTER_AGENT_HOST || '0.0.0.0';
const AUTH_TOKEN = process.env.PRINTER_AUTH_TOKEN || 'pos-local-usb-agent';
const SIMULATION_MODE = process.env.SIMULATION_MODE === 'true';
const DEFAULT_PRINTER_NAME = process.env.PRINTER_NAME || '';

const SIMULATED_DIR = path.join(__dirname, 'simulated_tickets');
if (!fs.existsSync(SIMULATED_DIR)) {
  fs.mkdirSync(SIMULATED_DIR, { recursive: true });
}

// Historial reciente para evitar dobles impresiones por reintentos rápidos (idempotencia de 4 segundos)
const recentPrintJobs = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [id, timestamp] of recentPrintJobs.entries()) {
    if (now - timestamp > 15000) {
      recentPrintJobs.delete(id);
    }
  }
}, 10000);

/**
 * Detecta impresoras instaladas en el sistema operativo
 */
function getSystemPrinters() {
  return new Promise((resolve) => {
    const platform = process.platform;
    try {
      if (platform === 'win32') {
        const cmd = 'powershell "Get-CimInstance Win32_Printer | Select-Object -ExpandProperty Name"';
        exec(cmd, { timeout: 3000 }, (err, stdout) => {
          if (err || !stdout) return resolve([]);
          const list = stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
          resolve(list);
        });
      } else if (platform === 'darwin' || platform === 'linux') {
        // En macOS y Linux, lpstat -e lista los nombres limpios de impresoras
        exec('lpstat -e', { timeout: 3000 }, (err, stdout) => {
          if (!err && stdout && stdout.trim()) {
            const list = stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
            if (list.length > 0) return resolve(list);
          }
          // Fallback con lpstat -p soportando múltiples idiomas (printer, impresora, imprimante, etc.)
          exec('lpstat -p', { timeout: 3000 }, (errP, stdoutP) => {
            if (errP || !stdoutP) return resolve([]);
            const list = [];
            const lines = stdoutP.split(/\r?\n/);
            for (const line of lines) {
              const m = line.match(/^(?:printer|impresora|imprimante|drucker)\s+(\S+)/i);
              if (m && m[1]) list.push(m[1]);
            }
            resolve(list);
          });
        });
      } else {
        resolve([]);
      }
    } catch {
      resolve([]);
    }
  });
}

/**
 * Selecciona la impresora térmica más adecuada y su ancho óptimo
 */
async function resolvePrinter() {
  if (DEFAULT_PRINTER_NAME) {
    const is58 = /58/i.test(DEFAULT_PRINTER_NAME);
    return { name: DEFAULT_PRINTER_NAME, detected: true, paperWidth: is58 ? '58mm' : '80mm' };
  }
  const printers = await getSystemPrinters();
  const thermalKeywords = /pos|receipt|thermal|ticket|epson|xprinter|star|bixolon|zj|tm-t|stmicro/i;
  const match = printers.find(p => thermalKeywords.test(p));

  if (match) {
    const is58 = /58/i.test(match);
    return { name: match, detected: true, paperWidth: is58 ? '58mm' : '80mm', allPrinters: printers };
  }
  return {
    name: printers[0] || 'Generic-Text-POS',
    detected: printers.length > 0,
    paperWidth: printers[0] && /58/i.test(printers[0]) ? '58mm' : '80mm',
    allPrinters: printers,
  };
}

/**
 * Convierte texto y opciones en secuencia de bytes ESC/POS estándar
 */
function buildEscPosBuffer(plainText, options = {}) {
  const chunks = [];

  // ESC @: Inicializar impresora
  chunks.push(Buffer.from([0x1B, 0x40]));

  // ESC t 0: Tabla de caracteres CP437 (Standard) o Latin1
  chunks.push(Buffer.from([0x1B, 0x74, 0x00]));

  // Si se solicita abrir cajón de dinero antes de imprimir
  if (options.openDrawer) {
    // ESC p 0 25 250 (Pulso de 50ms al pin 2)
    chunks.push(Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFA]));
  }

  // Texto del ticket codificado en Latin1 / ASCII
  // Reemplazamos acentos y caracteres especiales si la impresora no tiene fuentes UTF-8 nativas
  const cleanText = plainText
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quita diacríticos para evitar caracteres corruptos
    .replace(/[^\x20-\x7E\r\n]/g, ' '); // Deja caracteres imprimibles

  chunks.push(Buffer.from(cleanText, 'ascii'));

  // Salto de 4 líneas para despejar la cuchilla
  chunks.push(Buffer.from('\n\n\n\n', 'ascii'));

  // Si se solicita corte de papel
  if (options.cutPaper !== false) {
    // GS V 66 0: Corte parcial con avance
    chunks.push(Buffer.from([0x1D, 0x56, 0x42, 0x00]));
  }

  return Buffer.concat(chunks);
}

/**
 * Envía el buffer al dispositivo de impresión del sistema
 */
async function printBufferToSystem(buffer, printerName) {
  return new Promise((resolve, reject) => {
    const tempFile = path.join(os.tmpdir(), `ticket_escpos_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.bin`);
    fs.writeFileSync(tempFile, buffer);

    const platform = process.platform;
    let cmd = '';

    if (platform === 'win32') {
      // Envío Raw a impresora en Windows vía PowerShell
      cmd = `powershell -Command "Get-Content -Path '${tempFile}' -Encoding Byte -Raw | Out-Printer -Name '${printerName}'"`;
    } else if (platform === 'darwin' || platform === 'linux') {
      // Envío Raw a CUPS/lp en macOS / Linux
      cmd = `lp -d "${printerName}" -o raw "${tempFile}"`;
    } else {
      try { fs.unlinkSync(tempFile); } catch { }
      return reject(new Error(`Plataforma no soportada: ${platform}`));
    }

    exec(cmd, { timeout: 6000 }, (err, stdout, stderr) => {
      try { fs.unlinkSync(tempFile); } catch { }
      if (err) {
        return reject(new Error(stderr || err.message));
      }
      resolve({ stdout });
    });
  });
}

/**
 * Formatea el ticket en texto monoespaciado según ancho de papel
 */
function generatePlainTextReceipt(sale, options = {}) {
  const width = options.paperWidth === '58mm' ? 32 : 48;
  const line = (char = '-') => char.repeat(width);
  const center = (text) => {
    if (text.length >= width) return text.slice(0, width);
    const pad = Math.floor((width - text.length) / 2);
    return ' '.repeat(pad) + text;
  };
  const row = (left, right) => {
    const space = Math.max(1, width - left.length - right.length);
    return left + ' '.repeat(space) + right;
  };

  const business = options.businessName || 'RESTAURANTE POS';
  const rfc = options.rfc || 'XAXX010101000';
  const table = typeof sale.table === 'object' && sale.table !== null
    ? sale.table.number ?? '—'
    : String(sale.table || '—');

  const folio = sale.folio || (sale.id ? `VTA-${sale.id.slice(-6)}` : 'VTA-0000');
  const dateStr = new Date(sale.date || Date.now()).toLocaleDateString('es-MX');
  const timeStr = new Date(sale.date || Date.now()).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  const lines = [
    center(`*** ${business.toUpperCase()} ***`),
    center(`RFC: ${rfc}`),
    options.address ? center(options.address) : null,
    center('COMPROBANTE DE CONSUMO'),
    line('='),
    row(`FOLIO: ${folio}`, `MESA: ${table}`),
    row(`FECHA: ${dateStr}`, `HORA: ${timeStr}`),
    row(`TIPO: ${(sale.orderType || 'local').toUpperCase()}`, `PAGO: ${(sale.paymentMethod || 'efectivo').toUpperCase()}`),
    line('-'),
  ].filter(Boolean);

  if (width === 48) {
    lines.push('CANT  DESCRIPCION                  PRECIO    IMPORTE');
  } else {
    lines.push('CANT  PRODUCTO           IMPORTE');
  }
  lines.push(line('-'));

  const items = (sale.orders || []).flatMap(o => o.items || []);
  let computedSubtotal = 0;

  for (const it of items) {
    const qty = it.quantity || 1;
    const price = it.price || 0;
    const total = qty * price;
    computedSubtotal += total;

    const qtyStr = String(qty).padStart(2, ' ');
    const priceStr = `$${price.toFixed(2)}`;
    const totalStr = `$${total.toFixed(2)}`;

    if (width === 48) {
      const name = (it.recipe || 'Item').padEnd(24, ' ').slice(0, 24);
      lines.push(`${qtyStr}x  ${name}  ${priceStr.padStart(8, ' ')}  ${totalStr.padStart(8, ' ')}`);
    } else {
      const name = (it.recipe || 'Item').padEnd(16, ' ').slice(0, 16);
      lines.push(`${qtyStr}x ${name} ${totalStr.padStart(8, ' ')}`);
    }

    if (it.notes) {
      lines.push(`     * ${it.notes.slice(0, width - 7)}`);
    }
  }

  lines.push(line('-'));
  const baseSubtotal = computedSubtotal > 0 ? computedSubtotal : Number(sale.totalAmount || 0);
  lines.push(row('SUBTOTAL:', `$${baseSubtotal.toFixed(2)}`));

  if (sale.discountAmount && Number(sale.discountAmount) > 0) {
    const promo = sale.promotionApplied?.name ? ` (${sale.promotionApplied.name})` : '';
    lines.push(row(`DESCUENTO${promo}:`, `-$${Number(sale.discountAmount).toFixed(2)}`));
  }

  lines.push(line('='));
  lines.push(row('TOTAL A PAGAR:', `$${Number(sale.totalAmount || 0).toFixed(2)}`));
  lines.push(line('='));

  lines.push(row('ESTADO:', sale.status === 'paid' ? 'PAGADO (LIQUIDADO)' : 'POR COBRAR (PRE-CUENTA)'));
  lines.push('');
  lines.push(center(options.footerMessage || '¡Gracias por su visita!'));
  lines.push('');
  lines.push('');

  return lines.join('\n');
}

/**
 * Formatea la comanda de cocina (sin precios, con enfoque en platillos y especificaciones)
 */
function generateKitchenOrderReceipt(order, options = {}) {
  const width = options.paperWidth === '58mm' ? 32 : 48;
  const line = (char = '-') => char.repeat(width);
  const center = (text) => {
    if (text.length >= width) return text.slice(0, width);
    const pad = Math.floor((width - text.length) / 2);
    return ' '.repeat(pad) + text;
  };
  const row = (left, right) => {
    const space = Math.max(1, width - left.length - right.length);
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

  const station = options.stationName || order.stationName || (options.station === 'fria' || order.station === 'fria' ? 'COCINA FRÍA' : (options.station === 'caliente' || order.station === 'caliente' ? 'COCINA CALIENTE' : ''));
  const titleText = station ? `*** COMANDA DE ${station.toUpperCase()} ***` : '*** COMANDA DE COCINA ***';

  const lines = [
    center('================================'),
    center(titleText),
    center('================================'),
    row(`ORDEN: #${shortId}`, `MESA: ${tableNum}`),
    ...(station ? [row('ESTACIÓN:', station.toUpperCase())] : []),
    row(`FECHA: ${dateStr}`, `HORA: ${timeStr}`),
  ];

  if (order.notes) {
    lines.push(line('-'));
    lines.push(`NOTAS ORDEN: ${order.notes.toUpperCase()}`);
  }

  lines.push(line('='));
  lines.push(width === 48 ? 'CANT  PLATILLO / ESPECIFICACION' : 'CANT PLATILLO / NOTAS');
  lines.push(line('-'));

  const items = order.recipes || order.items || [];
  let totalItemsCount = 0;

  for (const it of items) {
    const qty = it.quantity || 1;
    totalItemsCount += qty;
    const name = it.name || (typeof it.recipe === 'object' && it.recipe !== null ? it.recipe?.name : it.recipe) || 'Platillo';
    const notes = it.notes || '';

    const qtyStr = `[ ${qty} ]`;
    if (width === 48) {
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

/**
 * Manejador principal HTTP
 */
const server = http.createServer(async (req, res) => {
  // Configuración de encabezados CORS para peticiones desde el frontend en internet o localhost
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-POS-Print-Token');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // Endpoint 1: GET /status
  if (req.method === 'GET' && url.pathname === '/status') {
    const printerInfo = await resolvePrinter();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'online',
      agentVersion: '1.0.0',
      platform: process.platform,
      printerName: printerInfo.name,
      printerConnected: printerInfo.detected,
      paperWidth: printerInfo.paperWidth || '80mm',
      mode: SIMULATION_MODE || !printerInfo.detected ? 'simulation' : 'usb',
      simulationMode: SIMULATION_MODE || !printerInfo.detected,
      allPrinters: printerInfo.allPrinters || [],
    }));
  }

  // Endpoint 2: GET /printers
  if (req.method === 'GET' && url.pathname === '/printers') {
    const printers = await getSystemPrinters();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ printers }));
  }

  // Endpoint 3: POST /print y POST /print-kitchen
  if (req.method === 'POST' && (url.pathname === '/print' || url.pathname === '/print-kitchen')) {
    // Validación básica de autenticación
    const token = req.headers['x-pos-print-token'];
    if (token !== AUTH_TOKEN) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'Token de autenticación de impresión inválido' }));
    }

    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 500000) { // Límite de 500 KB para evitar desbordamiento
        req.destroy();
      }
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const isKitchen = url.pathname === '/print-kitchen' || payload.type === 'kitchen' || Boolean(payload.order);
        const targetData = isKitchen ? (payload.order || payload.sale) : payload.sale;
        const { options = {}, forceReprint = false } = payload;

        if (!targetData) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            error: isKitchen ? 'Se requiere el objeto order para imprimir comanda de cocina' : 'Se requiere el objeto sale para imprimir'
          }));
        }

        const rawId = targetData.id || targetData._id || 'unknown';
        const stationSuffix = targetData.station || options.station ? `_${targetData.station || options.station}` : '';
        const jobId = isKitchen ? `kitchen_${rawId}${stationSuffix}` : String(rawId);

        // Verificación de idempotencia (evita que un reintento de red o doble envío imprima dos veces)
        if (!forceReprint && recentPrintJobs.has(jobId)) {
          const lastPrinted = recentPrintJobs.get(jobId);
          if (Date.now() - lastPrinted < 10000) {
            console.log(`[printer-agent] Solicitud duplicada ignorada para trabajo ${jobId}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
              success: true,
              duplicateIgnored: true,
              message: isKitchen
                ? 'La comanda ya fue impresa recientemente. Ignorando duplicado.'
                : 'El ticket ya fue enviado a impresión hace instantes. Ignorando duplicado.',
            }));
          }
        }

        // Generar texto estructurado según tipo de documento
        const receiptText = isKitchen
          ? generateKitchenOrderReceipt(targetData, options)
          : generatePlainTextReceipt(targetData, options);

        const printOpts = isKitchen
          ? { ...options, cutPaper: options.cutPaper ?? true, openDrawer: false }
          : options;

        const escPosBuffer = buildEscPosBuffer(receiptText, printOpts);

        // Resolver impresora
        const printerInfo = await resolvePrinter();
        const shouldSimulate = SIMULATION_MODE || !printerInfo.detected;

        if (shouldSimulate) {
          // Guardar en archivo simulado
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const prefix = isKitchen ? 'comanda_cocina' : 'ticket';
          const simFile = path.join(SIMULATED_DIR, `${prefix}_${rawId}_${timestamp}.txt`);
          fs.writeFileSync(simFile, receiptText, 'utf8');

          console.log(`\n================ ${isKitchen ? 'COMANDA DE COCINA' : 'TICKET CUENTA'} SIMULADO (ESC/POS) ================`);
          console.log(receiptText);
          console.log(`[printer-agent] Guardado en: ${simFile}`);
          console.log('===================================================================\n');

          recentPrintJobs.set(jobId, Date.now());
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: true,
            simulated: true,
            jobType: isKitchen ? 'kitchen' : 'account',
            printerName: printerInfo.name,
            message: isKitchen
              ? 'Comanda de cocina simulada (guardada en simulated_tickets/)'
              : 'Ticket impreso en modo simulación (guardado en simulated_tickets/)',
            filePath: simFile,
          }));
        }

        // Enviar a la impresora física real del sistema
        try {
          await printBufferToSystem(escPosBuffer, printerInfo.name);
          recentPrintJobs.set(jobId, Date.now());

          console.log(`[printer-agent] ${isKitchen ? 'Comanda de cocina' : 'Ticket'} enviado a la impresora real "${printerInfo.name}" para ${jobId}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: true,
            simulated: false,
            jobType: isKitchen ? 'kitchen' : 'account',
            printerName: printerInfo.name,
            message: isKitchen
              ? `Comanda de cocina impresa exitosamente en "${printerInfo.name}"`
              : `Ticket impreso exitosamente en "${printerInfo.name}"`,
          }));
        } catch (printErr) {
          console.error(`[printer-agent] Error al imprimir en "${printerInfo.name}":`, printErr.message);

          // Si falla la impresora física, guardar como simulación de respaldo y avisar
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const prefix = isKitchen ? 'failed_kitchen' : 'failed_account';
          const simFile = path.join(SIMULATED_DIR, `${prefix}_${rawId}_${timestamp}.txt`);
          fs.writeFileSync(simFile, receiptText, 'utf8');

          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            error: `Error de hardware en la impresora "${printerInfo.name}": ${printErr.message}`,
            fallbackFile: simFile,
          }));
        }
      } catch (parseErr) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'JSON inválido en el cuerpo de la petición' }));
      }
    });
    return;
  }

  // Ruta no encontrada
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
});

server.listen(PORT, HOST, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║        AGENTE LOCAL DE IMPRESIÓN TÉRMICA USB POS (v1.0.0)        ║
╚══════════════════════════════════════════════════════════════════╝
  ✓ Estado: En línea y escuchando peticiones
  ✓ Puerto: ${PORT}
  ✓ Host:   ${HOST} (Accesible desde localhost y Tablets en red local)
  ✓ Autenticación: Activa (Token requerido en cabeceras)
  ✓ Modo:   ${SIMULATION_MODE ? 'SIMULACIÓN FORZADA' : 'DETECCIÓN AUTOMÁTICA DE HARDWARE'}
  ✓ Rutas:
      GET  /status   -> Verificar conectividad y estado de la impresora
      GET  /printers -> Listar impresoras instaladas en el sistema
      POST /print    -> Enviar ticket a la impresora USB / ESC-POS
──────────────────────────────────────────────────────────────────
`);
});
