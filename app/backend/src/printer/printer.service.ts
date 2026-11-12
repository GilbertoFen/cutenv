import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { exec, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface PrinterStatusDto {
  online: boolean;
  printerConnected: boolean;
  printerName?: string;
  paperWidth?: '58mm' | '80mm';
  mode?: 'usb' | 'system' | 'simulation';
  allPrinters?: string[];
  error?: string;
}

@Injectable()
export class PrinterService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PrinterService.name);
  private agentPort = 5001;
  private agentUrl = `http://127.0.0.1:${this.agentPort}`;
  private recentJobs = new Map<string, number>();

  async onApplicationBootstrap() {
    this.ensureAgentRunning();
  }

  /**
   * Verifica si el agente de impresión en puerto 5001 responde, y si no, lo inicia.
   */
  async ensureAgentRunning() {
    try {
      const isAlive = await this.pingAgent();
      if (isAlive) {
        this.logger.log(`Agente de impresión local USB detectado y activo en ${this.agentUrl}`);
        return;
      }
    } catch { }

    const agentScript = this.findAgentScriptPath();
    if (!agentScript) {
      this.logger.warn('No se encontró printer-agent/server.js para auto-arranque.');
      return;
    }

    try {
      this.logger.log(`Iniciando agente de impresión USB desde: ${agentScript}`);
      const child = spawn(process.execPath, [agentScript], {
        detached: true,
        stdio: 'ignore',
        cwd: path.dirname(agentScript),
        env: {
          ...process.env,
          PRINTER_AGENT_PORT: String(this.agentPort),
          PRINTER_AGENT_HOST: '0.0.0.0',
        },
      });
      child.unref();
      this.logger.log(`Agente de impresión USB auto-iniciado en segundo plano (PID: ${child.pid}).`);
    } catch (err: any) {
      this.logger.error(`Error al iniciar agente de impresión USB: ${err?.message}`);
    }
  }

  private findAgentScriptPath(): string | null {
    const candidatePaths = [
      path.resolve(process.cwd(), 'printer-agent/server.js'),
      path.resolve(process.cwd(), '../printer-agent/server.js'),
      path.resolve(process.cwd(), '../../printer-agent/server.js'),
      path.resolve(__dirname, '../../../printer-agent/server.js'),
      path.resolve(__dirname, '../../../../printer-agent/server.js'),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  private pingAgent(): Promise<boolean> {
    return new Promise((resolve) => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 1000);
      fetch(`${this.agentUrl}/status`, { signal: controller.signal })
        .then((res) => {
          clearTimeout(t);
          resolve(res.ok);
        })
        .catch(() => {
          clearTimeout(t);
          resolve(false);
        });
    });
  }

  /**
   * Obtiene la lista de impresoras instaladas en el sistema operativo del host
   */
  async getSystemPrinters(): Promise<string[]> {
    return new Promise((resolve) => {
      const platform = process.platform;
      if (platform === 'win32') {
        const cmd = 'powershell "Get-CimInstance Win32_Printer | Select-Object -ExpandProperty Name"';
        exec(cmd, { timeout: 3000 }, (err, stdout) => {
          if (err || !stdout) return resolve([]);
          const list = stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
          resolve(list);
        });
      } else if (platform === 'darwin' || platform === 'linux') {
        exec('lpstat -e', { timeout: 3000 }, (err, stdout) => {
          if (!err && stdout && stdout.trim()) {
            const list = stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
            if (list.length > 0) return resolve(list);
          }
          exec('lpstat -p', { timeout: 3000 }, (errP, stdoutP) => {
            if (errP || !stdoutP) return resolve([]);
            const list: string[] = [];
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
    });
  }

  /**
   * Determina la impresora térmica conectada
   */
  async resolvePrinter(): Promise<{ name: string; detected: boolean; paperWidth: '58mm' | '80mm'; allPrinters: string[] }> {
    const printers = await this.getSystemPrinters();
    const thermalKeywords = /pos|receipt|thermal|ticket|epson|xprinter|star|bixolon|zj|tm-t|stmicro/i;
    const match = printers.find((p) => thermalKeywords.test(p));

    if (match) {
      const is58 = /58/i.test(match);
      return { name: match, detected: true, paperWidth: is58 ? '58mm' : '80mm', allPrinters: printers };
    }

    if (printers.length > 0) {
      const is58 = /58/i.test(printers[0]);
      return { name: printers[0], detected: true, paperWidth: is58 ? '58mm' : '80mm', allPrinters: printers };
    }

    return { name: 'Generic-POS-Thermal', detected: false, paperWidth: '58mm', allPrinters: [] };
  }

  /**
   * Consulta el estado del agente (o lo resuelve directamente si no está en puerto 5001)
   */
  async getStatus(): Promise<PrinterStatusDto> {
    try {
      const res = await fetch(`${this.agentUrl}/status`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const data = await res.json();
        return {
          online: true,
          printerConnected: Boolean(data.printerConnected),
          printerName: data.printerName,
          paperWidth: data.paperWidth || '58mm',
          mode: data.mode || 'usb',
          allPrinters: data.allPrinters || [],
        };
      }
    } catch { }

    // Fallback directo en el host si el agente 5001 no respondió
    this.ensureAgentRunning();
    const printerInfo = await this.resolvePrinter();
    return {
      online: true,
      printerConnected: printerInfo.detected,
      printerName: printerInfo.name,
      paperWidth: printerInfo.paperWidth,
      mode: printerInfo.detected ? 'usb' : 'simulation',
      allPrinters: printerInfo.allPrinters,
    };
  }

  /**
   * Imprime un ticket de venta
   */
  async printSale(sale: any, options: any = {}): Promise<{ success: boolean; message: string }> {
    // 1. Intentar enviar al agente en 5001
    try {
      const res = await fetch(`${this.agentUrl}/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-POS-Print-Token': 'pos-local-usb-agent',
        },
        body: JSON.stringify({ sale, options }),
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, message: data.message || 'Ticket impreso exitosamente' };
      }
    } catch (agentErr) {
      this.logger.warn(`Agente en 5001 no respondió, ejecutando impresión directa en host: ${agentErr}`);
    }

    // 2. Fallback de impresión directa mediante CUPS / lp
    return this.directPrintSale(sale, options);
  }

  /**
   * Imprime una comanda de cocina, separando automáticamente por estaciones (fría / caliente)
   */
  async printKitchen(order: any, options: any = {}): Promise<{ success: boolean; message: string }> {
    const items = (order.recipes || order.items || []).filter((it: any) => it.status !== 'cancelled');
    if (items.length === 0) {
      return { success: false, message: 'No hay platillos activos para imprimir' };
    }

    if (order.station) {
      return this.printSingleStationTicket(order, options);
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
      results.push(await this.printSingleStationTicket(coldOrder, { ...options, station: 'fria', stationName: 'COCINA FRÍA' }));
    }

    if (hotItems.length > 0) {
      const hotOrder = {
        ...order,
        station: 'caliente',
        stationName: 'COCINA CALIENTE',
        recipes: hotItems,
        items: hotItems,
      };
      results.push(await this.printSingleStationTicket(hotOrder, { ...options, station: 'caliente', stationName: 'COCINA CALIENTE' }));
    }

    const allOk = results.length > 0 && results.every((r) => r.success);
    return {
      success: allOk,
      message: allOk
        ? `Comandas enviadas exitosamente (${results.length} ticket${results.length > 1 ? 's' : ''})`
        : 'Error al imprimir una o más comandas de cocina',
    };
  }

  private async printSingleStationTicket(order: any, options: any = {}): Promise<{ success: boolean; message: string }> {
    // 1. Intentar enviar al agente en 5001
    try {
      const res = await fetch(`${this.agentUrl}/print-kitchen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-POS-Print-Token': 'pos-local-usb-agent',
        },
        body: JSON.stringify({ order, options }),
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, message: data.message || 'Comanda enviada a cocina exitosamente' };
      }
    } catch (agentErr) {
      this.logger.warn(`Agente en 5001 no respondió para cocina, ejecutando fallback directo: ${agentErr}`);
    }

    // 2. Fallback directo
    return this.directPrintKitchen(order, options);
  }

  /**
   * Impresión directa en el host vía CUPS (lp)
   */
  private async directPrintSale(sale: any, options: any): Promise<{ success: boolean; message: string }> {
    const printerInfo = await this.resolvePrinter();
    const paperWidth = options.paperWidth || printerInfo.paperWidth || '58mm';
    const text = this.formatSalePlainText(sale, paperWidth, options);
    const buffer = this.buildEscPosBuffer(text, options);

    return this.sendRawBufferToPrinter(buffer, printerInfo.name);
  }

  private async directPrintKitchen(order: any, options: any): Promise<{ success: boolean; message: string }> {
    const printerInfo = await this.resolvePrinter();
    const paperWidth = options.paperWidth || printerInfo.paperWidth || '58mm';
    const text = this.formatKitchenPlainText(order, paperWidth);
    const buffer = this.buildEscPosBuffer(text, { cutPaper: true, openDrawer: false });

    return this.sendRawBufferToPrinter(buffer, printerInfo.name);
  }

  private sendRawBufferToPrinter(buffer: Buffer, printerName: string): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      const tempFile = path.join(os.tmpdir(), `ticket_escpos_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.bin`);
      fs.writeFileSync(tempFile, buffer);

      const platform = process.platform;
      let cmd = '';

      if (platform === 'win32') {
        cmd = `powershell -Command "Get-Content -Path '${tempFile}' -Encoding Byte -Raw | Out-Printer -Name '${printerName}'"`;
      } else if (platform === 'darwin' || platform === 'linux') {
        cmd = `lp -d "${printerName}" -o raw "${tempFile}"`;
      } else {
        try { fs.unlinkSync(tempFile); } catch { }
        return resolve({ success: false, message: `Plataforma no soportada: ${platform}` });
      }

      exec(cmd, { timeout: 6000 }, (err, stdout, stderr) => {
        try { fs.unlinkSync(tempFile); } catch { }
        if (err) {
          this.logger.error(`Error al imprimir en "${printerName}": ${stderr || err.message}`);
          return resolve({ success: false, message: `Error de hardware en "${printerName}": ${stderr || err.message}` });
        }
        resolve({ success: true, message: `Ticket impreso exitosamente en "${printerName}"` });
      });
    });
  }

  private buildEscPosBuffer(plainText: string, options: any = {}): Buffer {
    const chunks: Buffer[] = [];
    chunks.push(Buffer.from([0x1B, 0x40])); // ESC @
    chunks.push(Buffer.from([0x1B, 0x74, 0x00])); // ESC t 0

    if (options.openDrawer) {
      chunks.push(Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFA]));
    }

    const cleanText = plainText
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E\r\n]/g, ' ');

    chunks.push(Buffer.from(cleanText, 'ascii'));
    chunks.push(Buffer.from('\n\n\n\n', 'ascii'));

    if (options.cutPaper !== false) {
      chunks.push(Buffer.from([0x1D, 0x56, 0x42, 0x00])); // GS V 66 0
    }

    return Buffer.concat(chunks);
  }

  private formatSalePlainText(sale: any, paperWidth: '58mm' | '80mm', options: any = {}): string {
    const width = paperWidth === '58mm' ? 32 : 48;
    const line = (char = '-') => char.repeat(width);
    const center = (text: string) => {
      if (text.length >= width) return text.slice(0, width);
      const pad = Math.floor((width - text.length) / 2);
      return ' '.repeat(pad) + text;
    };
    const row = (left: string, right: string) => {
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
    ].filter(Boolean) as string[];

    if (width === 48) {
      lines.push('CANT  DESCRIPCION                  PRECIO    IMPORTE');
    } else {
      lines.push('CANT  PRODUCTO           IMPORTE');
    }
    lines.push(line('-'));

    const items = (sale.orders || [])
      .filter((o: any) => o.status !== 'cancelled')
      .flatMap((o: any) => (o.items || []).filter((it: any) => it.status !== 'cancelled'));

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

  private formatKitchenPlainText(order: any, paperWidth: '58mm' | '80mm'): string {
    const width = paperWidth === '58mm' ? 32 : 48;
    const line = (char = '-') => char.repeat(width);
    const center = (text: string) => {
      if (text.length >= width) return text.slice(0, width);
      const pad = Math.floor((width - text.length) / 2);
      return ' '.repeat(pad) + text;
    };
    const row = (left: string, right: string) => {
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

    const station = order.stationName || (order.station === 'fria' ? 'COCINA FRÍA' : order.station === 'caliente' ? 'COCINA CALIENTE' : '');
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
      lines.push(`NOTAS: ${order.notes.toUpperCase()}`);
    }

    lines.push(line('='));
    lines.push(width === 48 ? 'CANT  PLATILLO / ESPECIFICACION' : 'CANT PLATILLO / NOTAS');
    lines.push(line('-'));

    const items = (order.recipes || order.items || []).filter((it: any) => it.status !== 'cancelled');
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
}
