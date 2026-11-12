import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Fiscalisto, FiscalistoError } from 'fiscalisto';
import type {
  InvoiceCreate,
  Invoice,
  RequestOptions,
  CancelInvoiceParams,
  SendInvoiceParams,
  ListInvoicesParams,
} from 'fiscalisto';

@Injectable()
export class FiscalistoService {
  private readonly logger = new Logger(FiscalistoService.name);
  private client: Fiscalisto | null = null;

  constructor() {
    this.initClient();
  }

  private initClient(): Fiscalisto {
    const apiKey = process.env.FISCALISTO_API_KEY?.trim();
    if (!apiKey) {
      this.logger.warn('FISCALISTO_API_KEY no está configurada en las variables de entorno.');
      this.client = null;
      return null as any;
    }

    if (!this.client) {
      try {
        this.client = new Fiscalisto(apiKey);
        const isLive = apiKey.startsWith('fk_live_');
        this.logger.log(`Fiscalisto SDK inicializado correctamente en modo ${isLive ? 'LIVE' : 'TEST'}.`);
      } catch (err: any) {
        this.logger.error('Error al instanciar cliente Fiscalisto: ' + err.message);
        this.client = null;
      }
    }

    return this.client!;
  }

  public isConfigured(): boolean {
    return Boolean(process.env.FISCALISTO_API_KEY?.trim());
  }

  public isLivemode(): boolean {
    return Boolean(process.env.FISCALISTO_API_KEY?.trim().startsWith('fk_live_'));
  }

  private ensureClient(): Fiscalisto {
    const client = this.client || this.initClient();
    if (!client) {
      throw new BadRequestException(
        'El servicio de facturación no está configurado (falta FISCALISTO_API_KEY en el servidor).'
      );
    }
    return client;
  }

  /**
   * Obtiene la cuenta asociada a la llave API.
   */
  async getAccount() {
    const client = this.ensureClient();
    try {
      return await client.account.get();
    } catch (err) {
      this.handleError(err, 'obtener cuenta de Fiscalisto');
    }
  }

  /**
   * Lista los emisores disponibles en la cuenta.
   */
  async getIssuers() {
    const client = this.ensureClient();
    try {
      return await client.issuers.list();
    } catch (err) {
      this.handleError(err, 'listar emisores de Fiscalisto');
    }
  }

  /**
   * Timbra una factura CFDI 4.0 con Fiscalisto.
   */
  async createInvoice(params: InvoiceCreate, options?: RequestOptions): Promise<Invoice> {
    const client = this.ensureClient();
    try {
      this.logger.log(`Solicitando timbrado de factura a Fiscalisto (IdempotencyKey: ${options?.idempotencyKey || 'N/A'})...`);
      const invoice = await client.invoices.create(params, options);
      this.logger.log(`Factura creada exitosamente en Fiscalisto: ID=${invoice.id}, UUID=${invoice.uuid}, Status=${invoice.status}`);
      return invoice;
    } catch (err) {
      this.handleError(err, 'crear factura en Fiscalisto');
    }
  }

  /**
   * Consulta una factura por su ID (inv_...) o UUID.
   */
  async getInvoice(id: string): Promise<Invoice> {
    const client = this.ensureClient();
    try {
      return await client.invoices.get(id);
    } catch (err) {
      this.handleError(err, 'consultar factura en Fiscalisto');
    }
  }

  /**
   * Recupera la representación XML timbrada del CFDI.
   */
  async getInvoiceXml(id: string): Promise<string> {
    const client = this.ensureClient();
    try {
      return await client.invoices.xml(id);
    } catch (err) {
      this.handleError(err, 'recuperar XML de factura en Fiscalisto');
    }
  }

  /**
   * Recupera la representación PDF oficial certificada del CFDI.
   */
  async getInvoicePdf(id: string): Promise<Uint8Array> {
    const client = this.ensureClient();
    try {
      return await client.invoices.pdf(id);
    } catch (err) {
      this.handleError(err, 'recuperar PDF de factura en Fiscalisto');
    }
  }

  /**
   * Envía la factura por correo electrónico al cliente (PDF y XML).
   */
  async sendInvoice(id: string, params?: SendInvoiceParams, options?: RequestOptions): Promise<Invoice> {
    const client = this.ensureClient();
    try {
      this.logger.log(`Enviando factura ${id} por correo a ${params?.to || 'destinatario del cliente'}...`);
      return await client.invoices.send(id, params || {}, options);
    } catch (err) {
      this.handleError(err, 'enviar factura por correo con Fiscalisto');
    }
  }

  /**
   * Cancela una factura ante el SAT mediante Fiscalisto.
   */
  async cancelInvoice(id: string, params?: CancelInvoiceParams, options?: RequestOptions): Promise<Invoice> {
    const client = this.ensureClient();
    try {
      this.logger.log(`Solicitando cancelación de factura ${id} (motivo: ${params?.motive || '02'})...`);
      return await client.invoices.cancel(id, params || { motive: '02' }, options);
    } catch (err) {
      this.handleError(err, 'cancelar factura en Fiscalisto');
    }
  }

  /**
   * Lista facturas emitidas en Fiscalisto.
   */
  async listInvoices(params?: ListInvoicesParams, options?: RequestOptions) {
    const client = this.ensureClient();
    try {
      return await client.invoices.list(params, options);
    } catch (err) {
      this.handleError(err, 'listar facturas en Fiscalisto');
    }
  }

  /**
   * Manejo centralizado de errores del SDK oficial de Fiscalisto.
   */
  private handleError(err: any, operation: string): never {
    if (err instanceof FiscalistoError) {
      const satCode = err.satCode ? ` [Código SAT: ${err.satCode}]` : '';
      const paramInfo = err.param ? ` (Campo: ${err.param})` : '';
      const msg = `Error al ${operation}: ${err.message}${satCode}${paramInfo}`;
      this.logger.error(`[FiscalistoError] ${msg} - Type: ${err.type}, Code: ${err.code}`);
      throw new BadRequestException(msg);
    }

    const fallbackMsg = err?.message || 'Error desconocido al comunicarse con el proveedor fiscal.';
    this.logger.error(`[Error] Fallo al ${operation}: ${fallbackMsg}`);
    throw new BadRequestException(`No se pudo completar la operación con Fiscalisto: ${fallbackMsg}`);
  }
}

