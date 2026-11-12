import { Injectable, Logger } from '@nestjs/common';
import { IPacProvider, CfdiPayload, PacStampResult, PacCancelResult, PacStatusResult } from './pac-provider.interface';
import { FiscalistoService } from '../fiscalisto.service';
import type { InvoiceCreate } from 'fiscalisto';

@Injectable()
export class FiscalistoPacAdapter implements IPacProvider {
  readonly providerName = 'fiscalisto';
  private readonly logger = new Logger(FiscalistoPacAdapter.name);

  constructor(private readonly fiscalistoService: FiscalistoService) {}

  async stamp(payload: CfdiPayload, idempotencyKey?: string): Promise<PacStampResult> {
    try {
      const items = (payload.conceptos || []).map((c) => ({
        description: c.descripcion,
        product_key: c.claveProdServ || '90101501',
        unit_key: c.claveUnidad || 'E48',
        unit_name: c.unidad || 'Servicio',
        sku: c.noIdentificacion || undefined,
        quantity: c.cantidad || 1,
        unit_price: c.valorUnitario,
        discount: c.descuento || undefined,
        taxability: (c.objetoImp as any) || '02',
        iva: '0.16' as const,
      }));

      const invoiceCreatePayload: InvoiceCreate = {
        customer: {
          tax_id: payload.receptor.rfc.toUpperCase().trim(),
          legal_name: payload.receptor.nombre.toUpperCase().trim(),
          tax_system: payload.receptor.regimenFiscalReceptor.trim(),
          zip: payload.receptor.domicilioFiscalReceptor.trim(),
          email: payload.receptor.email?.toLowerCase().trim() || null,
        },
        payment_form: payload.formaPago || '01',
        payment_method: payload.metodoPago || 'PUE',
        use: payload.receptor.usoCFDI || 'G03',
        currency: payload.moneda || 'MXN',
        series: payload.serie || undefined,
        items,
        send_email: Boolean(payload.sendEmail && payload.receptor.email),
      };

      if (payload.informacionGlobal) {
        invoiceCreatePayload.global = {
          periodicity: payload.informacionGlobal.periodicidad,
          months: payload.informacionGlobal.meses,
          year: payload.informacionGlobal.año,
        };
      }

      const inv = await this.fiscalistoService.createInvoice(
        invoiceCreatePayload,
        idempotencyKey ? { idempotencyKey } : undefined
      );

      if (!inv || !inv.uuid) {
        return {
          success: false,
          uuid: '',
          fechaTimbrado: new Date(),
          xmlContent: '',
          error: inv?.error?.message || 'Fiscalisto no devolvió UUID para la factura.',
        };
      }

      // Recuperar XML oficial timbrado
      let xmlContent = '';
      try {
        xmlContent = await this.fiscalistoService.getInvoiceXml(inv.id);
      } catch (xmlErr: any) {
        this.logger.warn(`No se pudo descargar XML de Fiscalisto de inmediato: ${xmlErr.message}`);
      }

      return {
        success: true,
        uuid: inv.uuid,
        fechaTimbrado: new Date(inv.created_at || Date.now()),
        xmlContent,
        fiscalistoInvoiceId: inv.id,
      };
    } catch (err: any) {
      this.logger.error(`Error en timbrado con Fiscalisto: ${err.message}`);
      return {
        success: false,
        uuid: '',
        fechaTimbrado: new Date(),
        xmlContent: '',
        error: err.message || 'Error al comunicarse con Fiscalisto.',
      };
    }
  }

  async cancel(uuid: string, motivo: string = '02', folioSustitucion?: string): Promise<PacCancelResult> {
    try {
      const motive = (['01', '02', '03', '04'].includes(motivo) ? motivo : '02') as '01' | '02' | '03' | '04';
      const inv = await this.fiscalistoService.cancelInvoice(uuid, {
        motive,
        substitution: folioSustitucion || undefined,
      });

      return {
        success: true,
        uuid: inv.uuid || uuid,
        status: inv.status === 'pending' ? 'pending_cancellation' : 'cancelled',
        message: 'Comprobante cancelado exitosamente en Fiscalisto.',
      };
    } catch (err: any) {
      this.logger.error(`Error al cancelar en Fiscalisto: ${err.message}`);
      return {
        success: false,
        uuid,
        status: 'error',
        message: err.message || 'Error al cancelar comprobante.',
      };
    }
  }

  async getStatus(uuid: string, _rfcEmisor: string, _rfcReceptor: string, _total: number): Promise<PacStatusResult> {
    try {
      const inv = await this.fiscalistoService.getInvoice(uuid);
      const isCancelled = inv.status === 'canceled';
      return {
        uuid: inv.uuid || uuid,
        status: isCancelled ? 'cancelado' : 'vigente',
        isCancellable: !isCancelled,
        cancellationStatus: isCancelled ? 'Cancelado' : undefined,
      };
    } catch (err: any) {
      return {
        uuid,
        status: 'no_encontrado',
        isCancellable: false,
      };
    }
  }

  async validateCredentials(): Promise<{ valid: boolean; message: string; data?: any }> {
    try {
      if (!this.fiscalistoService.isConfigured()) {
        return {
          valid: false,
          message: 'FISCALISTO_API_KEY no está configurada en las variables de entorno del backend.',
        };
      }

      const account = await this.fiscalistoService.getAccount();
      const isLive = this.fiscalistoService.isLivemode();
      return {
        valid: true,
        message: `Conexión exitosa con Fiscalisto (${isLive ? 'Ambiente Producción' : 'Ambiente Test / Pruebas'}).`,
        data: account,
      };
    } catch (err: any) {
      return {
        valid: false,
        message: `Error al autenticar con Fiscalisto: ${err.message}`,
      };
    }
  }
}
