export interface CfdiConcepto {
  claveProdServ: string;
  noIdentificacion?: string;
  cantidad: number;
  claveUnidad: string;
  unidad: string;
  descripcion: string;
  valorUnitario: number;
  importe: number;
  descuento?: number;
  objetoImp: string; // '01' No objeto, '02' Sí objeto
  impuestos?: {
    traslados?: Array<{
      base: number;
      impuesto: string; // '002' (IVA)
      tipoFactor: 'Tasa' | 'Cuota' | 'Exento';
      tasaOCuota: number;
      importe: number;
    }>;
  };
}

export interface CfdiPayload {
  serie: string;
  folio: string;
  fecha: string; // YYYY-MM-DDTHH:mm:ss
  formaPago: string; // SAT FormaPago
  metodoPago: 'PUE' | 'PPD';
  moneda: string; // 'MXN'
  tipoDeComprobante: 'I';
  exportacion: '01';
  lugarExpedicion: string; // CP
  subtotal: number;
  descuento?: number;
  total: number;
  emisor: {
    rfc: string;
    nombre: string;
    regimenFiscal: string;
  };
  receptor: {
    rfc: string;
    nombre: string;
    domicilioFiscalReceptor: string;
    regimenFiscalReceptor: string;
    usoCFDI: string;
    email?: string;
  };
  informacionGlobal?: {
    periodicidad: '01' | '02' | '03' | '04';
    meses: string;
    año: number;
  };
  conceptos: CfdiConcepto[];
  impuestos?: {
    totalImpuestosTrasladados: number;
    traslados: Array<{
      base: number;
      impuesto: string;
      tipoFactor: string;
      tasaOCuota: number;
      importe: number;
    }>;
  };
}

export interface PacStampResult {
  success: boolean;
  uuid: string;
  fechaTimbrado: Date;
  noCertificadoSAT?: string;
  noCertificadoEmisor?: string;
  selloCFD?: string;
  selloSAT?: string;
  cadenaOriginalSAT?: string;
  xmlContent: string;
  qrCodeUrl?: string;
  error?: string;
}

export interface PacCancelResult {
  success: boolean;
  uuid: string;
  status: 'cancelled' | 'pending_cancellation' | 'rejected' | 'error';
  message: string;
  satStatusCode?: string;
}

export interface PacStatusResult {
  uuid: string;
  status: 'vigente' | 'cancelado' | 'no_encontrado';
  isCancellable: boolean;
  cancellationStatus?: string;
}

export interface IPacProvider {
  readonly providerName: string;

  /**
   * Envía el comprobante para timbrado ante el PAC y el SAT
   */
  stamp(payload: CfdiPayload): Promise<PacStampResult>;

  /**
   * Solicita la cancelación de un CFDI timbrado
   */
  cancel(
    uuid: string,
    reason: '01' | '02' | '03' | '04',
    replacementUuid?: string
  ): Promise<PacCancelResult>;

  /**
   * Consulta el estado del CFDI en el SAT mediante el PAC
   */
  getStatus(uuid: string, rfcEmisor: string, rfcReceptor: string, total: number): Promise<PacStatusResult>;

  /**
   * Valida credenciales con el PAC
   */
  validateCredentials(): Promise<{ valid: boolean; message: string }>;
}
