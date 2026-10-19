/**
 * Catálogos y validadores oficiales del SAT para CFDI 4.0
 * Referencia: Anexo 20 SAT y matrices de catálogos c_RegimenFiscal, c_UsoCFDI, c_FormaPago, etc.
 */

export interface SatCatalogItem {
  code: string;
  description: string;
  appliesToFisica?: boolean;
  appliesToMoral?: boolean;
}

// Catálogo c_RegimenFiscal (SAT CFDI 4.0)
export const SAT_REGIMENES_FISCALES: SatCatalogItem[] = [
  { code: '601', description: 'General de Ley Personas Morales', appliesToMoral: true, appliesToFisica: false },
  { code: '603', description: 'Personas Morales con Fines no Lucrativos', appliesToMoral: true, appliesToFisica: false },
  { code: '605', description: 'Sueldos y Salarios e Ingresos Asimilados a Salarios', appliesToMoral: false, appliesToFisica: true },
  { code: '606', description: 'Arrendamiento', appliesToMoral: false, appliesToFisica: true },
  { code: '612', description: 'Personas Físicas con Actividades Empresariales y Profesionales', appliesToMoral: false, appliesToFisica: true },
  { code: '614', description: 'Ingresos por Intereses', appliesToMoral: false, appliesToFisica: true },
  { code: '616', description: 'Sin obligaciones fiscales', appliesToMoral: false, appliesToFisica: true },
  { code: '621', description: 'Incorporación Fiscal', appliesToMoral: false, appliesToFisica: true },
  { code: '625', description: 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas', appliesToMoral: false, appliesToFisica: true },
  { code: '626', description: 'Régimen Simplificado de Confianza (RESICO)', appliesToMoral: true, appliesToFisica: true },
];

// Catálogo c_UsoCFDI (SAT CFDI 4.0)
export const SAT_USOS_CFDI: SatCatalogItem[] = [
  { code: 'G01', description: 'Adquisición de mercancías' },
  { code: 'G02', description: 'Devoluciones, descuentos o bonificaciones' },
  { code: 'G03', description: 'Gastos en general' },
  { code: 'I01', description: 'Construcciones' },
  { code: 'I02', description: 'Mobiliario y equipo de oficina por inversiones' },
  { code: 'I03', description: 'Equipo de transporte' },
  { code: 'I04', description: 'Equipo de computo y accesorios' },
  { code: 'D01', description: 'Honorarios médicos, dentales y gastos hospitalarios' },
  { code: 'D02', description: 'Gastos médicos por incapacidad o discapacidad' },
  { code: 'D04', description: 'Donativos' },
  { code: 'D07', description: 'Primas por seguros de gastos médicos' },
  { code: 'D08', description: 'Gastos de transportación escolar obligatoria' },
  { code: 'S01', description: 'Sin efectos fiscales' },
  { code: 'CP01', description: 'Pagos' },
  { code: 'CN01', description: 'Nómina' },
];

// Catálogo c_FormaPago (SAT)
export const SAT_FORMAS_PAGO: SatCatalogItem[] = [
  { code: '01', description: 'Efectivo' },
  { code: '02', description: 'Cheque nominativo' },
  { code: '03', description: 'Transferencia electrónica de fondos' },
  { code: '04', description: 'Tarjeta de crédito' },
  { code: '28', description: 'Tarjeta de débito' },
  { code: '29', description: 'Tarjeta de servicios' },
  { code: '99', description: 'Por definir' },
];

// Catálogo c_MetodoPago (SAT)
export const SAT_METODOS_PAGO: SatCatalogItem[] = [
  { code: 'PUE', description: 'Pago en una sola exhibición' },
  { code: 'PPD', description: 'Pago en parcialidades o diferido' },
];

// Catálogo c_Periodicidad (Para Factura Global - CFDI 4.0)
export const SAT_PERIODICIDADES: SatCatalogItem[] = [
  { code: '01', description: 'Diario' },
  { code: '02', description: 'Semanal' },
  { code: '03', description: 'Quincenal' },
  { code: '04', description: 'Mensual' },
  { code: '05', description: 'Bimestral (Exclusivo RIF)' },
];

// Catálogo c_Meses (Para Factura Global)
export const SAT_MESES: SatCatalogItem[] = [
  { code: '01', description: 'Enero' },
  { code: '02', description: 'Febrero' },
  { code: '03', description: 'Marzo' },
  { code: '04', description: 'Abril' },
  { code: '05', description: 'Mayo' },
  { code: '06', description: 'Junio' },
  { code: '07', description: 'Julio' },
  { code: '08', description: 'Agosto' },
  { code: '09', description: 'Septiembre' },
  { code: '10', description: 'Octubre' },
  { code: '11', description: 'Noviembre' },
  { code: '12', description: 'Diciembre' },
];

// Motivos de Cancelación SAT
export const SAT_MOTIVOS_CANCELACION: SatCatalogItem[] = [
  { code: '01', description: 'Comprobante emitido con errores con relación' },
  { code: '02', description: 'Comprobante emitido con errores sin relación' },
  { code: '03', description: 'No se llevó a cabo la operación' },
  { code: '04', description: 'Operación nominativa relacionada en una factura global' },
];

// RFC Genéricos Oficiales SAT
export const RFC_PUBLICO_EN_GENERAL = 'XAXX010101000';
export const RFC_EXTRANJEROS = 'XEXX010101000';

// Expresión Regular Oficial para validación de RFC Mexicano
// Personas Morales: 3 letras + 6 números + 3 homoclave
// Personas Físicas: 4 letras + 6 números + 3 homoclave
// Genéricos: XAXX010101000 y XEXX010101000
export const RFC_REGEX = /^([A-ZÑ&]{3,4}) ?(?:0[1-9]|[1-9][0-9])(?:0[1-9]|1[0-2])(?:0[1-9]|[12][0-9]|3[01])[A-Z0-9]{2}[0-9A]$/;

export function isValidRfc(rfc: string): boolean {
  if (!rfc) return false;
  const clean = rfc.trim().toUpperCase();
  if (clean === RFC_PUBLICO_EN_GENERAL || clean === RFC_EXTRANJEROS) return true;
  return RFC_REGEX.test(clean);
}

export function isMoralRfc(rfc: string): boolean {
  const clean = rfc.trim().toUpperCase();
  return clean.length === 12 && clean !== RFC_PUBLICO_EN_GENERAL && clean !== RFC_EXTRANJEROS;
}

export function isValidPostalCode(cp: string): boolean {
  return /^[0-9]{5}$/.test(cp.trim());
}

/**
 * Mapeo de métodos de pago internos del POS a claves de forma de pago SAT
 */
export function mapPaymentMethodToSatFormaPago(method?: string): string {
  if (!method) return '01'; // Default efectivo
  const m = method.toLowerCase().trim();
  if (m === 'efectivo' || m === 'cash') return '01';
  if (m === 'transferencia' || m === 'spei' || m === 'transfer') return '03';
  if (m === 'tarjeta' || m === 'card' || m === 'tarjeta de debito' || m === 'debito') return '28'; // Tarjeta de débito
  if (m === 'tarjeta de credito' || m === 'credito') return '04'; // Tarjeta de crédito
  return '01';
}
