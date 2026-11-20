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
  const totalNetSales = sales.reduce((acc, s) => acc + (s.status !== 'cancelled' ? (s.totalAmount || 0) : 0), 0);
  const totalTips = sales.reduce((acc, s) => acc + (s.status !== 'cancelled' ? (s.tipAmount || 0) : 0), 0);
  const totalCobrado = totalNetSales + totalTips;

  let totalEfectivoNeto = 0;
  let totalEfectivoPropina = 0;
  let totalTarjetaNeto = 0;
  let totalTarjetaPropina = 0;
  let totalTransferenciaNeto = 0;
  let totalTransferenciaPropina = 0;
  let totalOtrosNeto = 0;
  let totalOtrosPropina = 0;

  let pagadasCount = 0;
  let sinPagarCount = 0;
  let parcialCount = 0;
  let canceladasCount = 0;

  for (const s of sales) {
    if (s.status === 'cancelled') {
      canceladasCount++;
      continue;
    }

    const pm = (s.paymentMethod || '').toLowerCase();
    const net = s.totalAmount || 0;
    const tip = s.tipAmount || 0;

    if (pm.includes('efectivo') || pm === 'cash') {
      totalEfectivoNeto += net;
      totalEfectivoPropina += tip;
    } else if (pm.includes('tarjeta') || pm === 'card' || pm === 'card_terminal') {
      totalTarjetaNeto += net;
      totalTarjetaPropina += tip;
    } else if (pm.includes('transfer') || pm === 'spei') {
      totalTransferenciaNeto += net;
      totalTransferenciaPropina += tip;
    } else {
      totalOtrosNeto += net;
      totalOtrosPropina += tip;
    }

    const st = (s.status || '').toLowerCase();
    if (st === 'paid') pagadasCount++;
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
    ['INDICADOR GENERAL', 'VALOR (MXN)'],
    ['1. Venta Total Neta (Exclusivo productos)', totalNetSales],
    ['2. Propinas Totales (Gratificaciones de servicio)', totalTips],
    ['3. Total General Cobrado (Venta neta + propinas)', totalCobrado],
    ['Número Total de Operaciones', totalOperaciones],
    ['Ticket Promedio (Calculado sobre Venta Neta)', totalOperaciones > 0 ? totalNetSales / totalOperaciones : 0],
    [''],
    ['DESGLOSE POR MÉTODO DE PAGO', 'VENTA NETA (MXN)', 'PROPINAS (MXN)', 'TOTAL COBRADO (MXN)'],
    ['Total en Efectivo', totalEfectivoNeto, totalEfectivoPropina, totalEfectivoNeto + totalEfectivoPropina],
    ['Total con Tarjeta (Débito / Crédito)', totalTarjetaNeto, totalTarjetaPropina, totalTarjetaNeto + totalTarjetaPropina],
    ['Total por Transferencia Electrónica', totalTransferenciaNeto, totalTransferenciaPropina, totalTransferenciaNeto + totalTransferenciaPropina],
    ['Total Otros / No Especificado', totalOtrosNeto, totalOtrosPropina, totalOtrosNeto + totalOtrosPropina],
    [''],
    ['ESTADO DE LAS CUENTAS', 'CANTIDAD'],
    ['Ventas Pagadas (Cobradas)', pagadasCount],
    ['Ventas Pendientes / Sin Pagar', sinPagarCount],
    ['Ventas con Pago Parcial', parcialCount],
    ['Ventas Canceladas', canceladasCount],
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
  wsResumen['!cols'] = [{ wch: 42 }, { wch: 22 }, { wch: 18 }, { wch: 22 }];

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
    'Venta Neta (MXN)',
    'Propina (MXN)',
    'Total Cobrado (MXN)',
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
    const discount = s.discountAmount || 0;
    const netSale = s.totalAmount || 0;
    const subtotal = anySale.subtotal || (netSale + discount);
    const tip = s.tipAmount || anySale.tipAmount || 0;
    const totalCobrado = netSale + tip;

    return [
      s.folio || s.id || '—',
      fechaStr,
      horaStr,
      getTableNumber(s.table) === '—' ? 'Sin mesa' : `Mesa ${getTableNumber(s.table)}`,
      s.orderType || 'local',
      translateSaleStatus(s.status),
      subtotal,
      discount,
      netSale,
      tip,
      totalCobrado,
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
    'Venta Neta',
    'Propina',
    'Total Cobrado',
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
    const discount = Number(s.discountAmount || 0);
    const netSale = Number(s.totalAmount || 0);
    const subtotal = Number(anySale.subtotal || (netSale + discount));
    const tip = Number(s.tipAmount || anySale.tipAmount || 0);
    const totalCobrado = netSale + tip;

    const row = [
      s.folio || s.id || '—',
      fechaStr,
      horaStr,
      getTableNumber(s.table) === '—' ? 'Sin mesa' : `Mesa ${getTableNumber(s.table)}`,
      s.orderType || 'local',
      translateSaleStatus(s.status),
      s.paymentMethod || 'No especificado',
      subtotal.toFixed(2),
      discount.toFixed(2),
      netSale.toFixed(2),
      tip.toFixed(2),
      totalCobrado.toFixed(2),
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
