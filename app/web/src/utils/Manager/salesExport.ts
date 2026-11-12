import * as XLSX from 'xlsx';
import type { SaleData } from '@/types';
import { currency, dateFormat, getTableNumber, translateSaleStatus } from '@/utils/Manager/manager.functions';

interface ExportFilterOptions {
  from: string;
  to: string;
  orderType?: string;
}

/**
 * Genera y descarga un libro de Excel (.xlsx) profesional con 3 hojas:
 * Hoja 1: Resumen de ventas (KPIs y desgloses por método de pago)
 * Hoja 2: Detalle de ventas (Una fila por cada venta/cuenta con todos sus atributos)
 * Hoja 3: Productos vendidos (Desglose individual de cada platillo/producto consumido)
 */
export function exportSalesToExcel(sales: SaleData[], options: ExportFilterOptions) {
  const wb = XLSX.utils.book_new();

  // ==========================================
  // HOJA 1: RESUMEN DE VENTAS
  // ==========================================
  const totalOperaciones = sales.length;
  const totalRecaudado = sales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);

  let totalEfectivo = 0;
  let totalTarjeta = 0;
  let totalTransferencia = 0;
  let totalOtros = 0;

  let pagadasCount = 0;
  let sinPagarCount = 0;
  let parcialCount = 0;
  let canceladasCount = 0;

  for (const s of sales) {
    const pm = (s.paymentMethod || '').toLowerCase();
    const amt = s.totalAmount || 0;

    if (pm.includes('efectivo') || pm === 'cash') totalEfectivo += amt;
    else if (pm.includes('tarjeta') || pm === 'card' || pm === 'card_terminal') totalTarjeta += amt;
    else if (pm.includes('transfer') || pm === 'spei') totalTransferencia += amt;
    else totalOtros += amt;

    const st = (s.status || '').toLowerCase();
    if (st === 'paid') pagadasCount++;
    else if (st === 'cancelled') canceladasCount++;
    else if (st === 'partial') parcialCount++;
    else sinPagarCount++;
  }

  const resumenData: any[][] = [
    ['REPORTE EJECUTIVO DE VENTAS Y FACTURACIÓN'],
    ['Restaurante POS - Sistema Contable y Operativo'],
    [''],
    ['Filtro - Fecha Inicial:', options.from],
    ['Filtro - Fecha Final:', options.to],
    ['Filtro - Tipo de Pedido:', options.orderType === 'all' ? 'Todos los tipos' : (options.orderType || 'Todos')],
    ['Fecha de Generación:', new Date().toLocaleString('es-MX')],
    [''],
    ['INDICADOR GENERAL', 'VALOR'],
    ['Total de Ventas Recaudado (MXN)', totalRecaudado],
    ['Número Total de Operaciones', totalOperaciones],
    ['Ticket Promedio (MXN)', totalOperaciones > 0 ? totalRecaudado / totalOperaciones : 0],
    [''],
    ['DESGLOSE POR MÉTODO DE PAGO', 'MONTO (MXN)'],
    ['Total en Efectivo', totalEfectivo],
    ['Total con Tarjeta (Débito / Crédito)', totalTarjeta],
    ['Total por Transferencia Electrónica', totalTransferencia],
    ['Total Otros / No Especificado', totalOtros],
    [''],
    ['ESTADO DE LAS CUENTAS', 'CANTIDAD'],
    ['Ventas Pagadas (Cobradas)', pagadasCount],
    ['Ventas Pendientes / Sin Pagar', sinPagarCount],
    ['Ventas con Pago Parcial', parcialCount],
    ['Ventas Canceladas', canceladasCount],
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
  wsResumen['!cols'] = [{ wch: 38 }, { wch: 22 }];

  // ==========================================
  // HOJA 2: DETALLE DE VENTAS
  // ==========================================
  const detalleHeaders = [
    'ID Venta / Folio',
    'Fecha',
    'Hora',
    'Mesa',
    'Tipo de Orden',
    'Estado',
    'Subtotal (MXN)',
    'Descuentos (MXN)',
    'Propina (MXN)',
    'Total (MXN)',
    'Método de Pago',
    'Facturada CFDI',
    'Responsable / Cancelado por',
    'Nota / Motivo Cancelación',
  ];

  const detalleRows = sales.map((s) => {
    let fechaStr = '—';
    let horaStr = '—';
    if (s.date) {
      try {
        const d = new Date(s.date);
        fechaStr = d.toLocaleDateString('es-MX');
        horaStr = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      } catch {
        fechaStr = String(s.date);
      }
    }

    const anySale = s as any;
    const subtotal = anySale.subtotal || s.totalAmount || 0;
    const discount = s.discountAmount || 0;
    const tip = anySale.tipAmount || 0;
    const total = s.totalAmount || 0;

    return [
      s.folio || s.id || '—',
      fechaStr,
      horaStr,
      getTableNumber(s.table) === '—' ? 'Sin mesa' : `Mesa ${getTableNumber(s.table)}`,
      s.orderType || 'local',
      translateSaleStatus(s.status),
      subtotal,
      discount,
      tip,
      total,
      s.paymentMethod || 'No especificado',
      s.isFacturada ? 'Sí' : 'No',
      s.cancelledBy || anySale.cashierName || 'Personal POS',
      s.cancelReason || '—',
    ];
  });

  const wsDetalle = XLSX.utils.aoa_to_sheet([detalleHeaders, ...detalleRows]);
  wsDetalle['!cols'] = [
    { wch: 18 }, // ID / Folio
    { wch: 12 }, // Fecha
    { wch: 10 }, // Hora
    { wch: 12 }, // Mesa
    { wch: 15 }, // Tipo de orden
    { wch: 14 }, // Estado
    { wch: 15 }, // Subtotal
    { wch: 16 }, // Descuentos
    { wch: 14 }, // Propina
    { wch: 15 }, // Total
    { wch: 18 }, // Metodo de pago
    { wch: 15 }, // Facturada
    { wch: 22 }, // Responsable
    { wch: 30 }, // Nota / Motivo
  ];

  if (detalleRows.length > 0) {
    wsDetalle['!autofilter'] = {
      ref: `A1:N${detalleRows.length + 1}`,
    };
  }

  // ==========================================
  // HOJA 3: PRODUCTOS VENDIDOS
  // ==========================================
  const productosHeaders = [
    'ID Venta / Folio',
    'Fecha',
    'Hora',
    'Producto / Platillo',
    'Categoría',
    'Cantidad',
    'Precio Unitario (MXN)',
    'Descuento Aplicado (MXN)',
    'Importe Total (MXN)',
    'Tipo de Producto',
  ];

  const productosRows: any[][] = [];

  for (const s of sales) {
    let fechaStr = '—';
    let horaStr = '—';
    if (s.date) {
      try {
        const d = new Date(s.date);
        fechaStr = d.toLocaleDateString('es-MX');
        horaStr = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      } catch {
        fechaStr = String(s.date);
      }
    }

    const folio = s.folio || s.id || '—';

    if (Array.isArray(s.orders)) {
      for (const ord of s.orders as any[]) {
        if (Array.isArray(ord.items)) {
          for (const it of ord.items) {
            const recipeName = it.recipe?.name || it.recipe || it.name || 'Platillo preparado';
            const cat = it.recipe?.category || 'Alimentos y Bebidas';
            const qty = Number(it.quantity) || 1;
            const price = Number(it.price) || 0;
            const disc = Number(it.discount) || 0;
            const total = qty * price - disc;
            const prodType = it.recipe?.category === 'Bebidas' ? 'Bebida' : 'Preparación / Receta';

            productosRows.push([
              folio,
              fechaStr,
              horaStr,
              recipeName,
              cat,
              qty,
              price,
              disc,
              total,
              prodType,
            ]);
          }
        }
      }
    }
  }

  const wsProductos = XLSX.utils.aoa_to_sheet([productosHeaders, ...productosRows]);
  wsProductos['!cols'] = [
    { wch: 18 }, // ID Venta
    { wch: 12 }, // Fecha
    { wch: 10 }, // Hora
    { wch: 28 }, // Producto
    { wch: 18 }, // Categoria
    { wch: 10 }, // Cantidad
    { wch: 20 }, // Precio Unitario
    { wch: 22 }, // Descuento
    { wch: 18 }, // Importe Total
    { wch: 20 }, // Tipo de producto
  ];

  if (productosRows.length > 0) {
    wsProductos['!autofilter'] = {
      ref: `A1:J${productosRows.length + 1}`,
    };
  }

  // Agregar hojas al libro
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen de ventas');
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle de ventas');
  XLSX.utils.book_append_sheet(wb, wsProductos, 'Productos vendidos');

  // Descarga directa en navegador
  const fileName = `Reporte_Ventas_${options.from}_al_${options.to}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Exportación a formato CSV estructurado con UTF-8 BOM para compatibilidad con Excel en español.
 */
export function exportSalesToCSV(sales: SaleData[], options: ExportFilterOptions) {
  const sanitize = (v: any): string => {
    const s = String(v ?? '');
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines: string[] = [];

  // Metadata
  lines.push(['Reporte de Ventas', `${options.from} al ${options.to}`].map(sanitize).join(','));
  lines.push(['Tipo de pedido:', options.orderType || 'Todos'].map(sanitize).join(','));
  lines.push('');

  // Encabezados
  const headers = [
    'Folio',
    'Fecha',
    'Hora',
    'Mesa',
    'Tipo de Pedido',
    'Estado',
    'Método de Pago',
    'Subtotal',
    'Descuento',
    'Total',
    'Facturada',
    'Cancelado Por',
    'Motivo Cancelación',
  ];
  lines.push(headers.map(sanitize).join(','));

  for (const s of sales) {
    let fechaStr = '—';
    let horaStr = '—';
    if (s.date) {
      try {
        const d = new Date(s.date);
        fechaStr = d.toLocaleDateString('es-MX');
        horaStr = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      } catch {
        fechaStr = String(s.date);
      }
    }

    const anySale = s as any;
    const row = [
      s.folio || s.id || '—',
      fechaStr,
      horaStr,
      getTableNumber(s.table) === '—' ? 'Sin mesa' : `Mesa ${getTableNumber(s.table)}`,
      s.orderType || 'local',
      translateSaleStatus(s.status),
      s.paymentMethod || 'No especificado',
      Number(anySale.subtotal || s.totalAmount || 0).toFixed(2),
      Number(s.discountAmount || 0).toFixed(2),
      Number(s.totalAmount || 0).toFixed(2),
      s.isFacturada ? 'Sí' : 'No',
      s.cancelledBy || anySale.cashierName || '—',
      s.cancelReason || '—',
    ];
    lines.push(row.map(sanitize).join(','));
  }

  // BOM UTF-8 (\uFEFF) para que Excel reconozca acentos y caracteres especiales automáticamente
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Reporte_Ventas_${options.from}_al_${options.to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
