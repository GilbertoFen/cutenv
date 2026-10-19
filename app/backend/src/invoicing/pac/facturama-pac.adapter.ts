import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import {
  IPacProvider,
  CfdiPayload,
  PacStampResult,
  PacCancelResult,
  PacStatusResult,
} from './pac-provider.interface';

/**
 * Adaptador para Facturama PAC (Proveedor Autorizado de Certificación SAT)
 * Soporta API v3 de CFDI 4.0 con ambientes Sandbox y Producción.
 * Documentación oficial: https://apisandbox.facturama.mx/guias/cfdi40
 */
@Injectable()
export class FacturamaPacAdapter implements IPacProvider {
  readonly providerName = 'facturama';
  private readonly logger = new Logger(FacturamaPacAdapter.name);

  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(username: string, passwordEncrypted: string, environment: 'sandbox' | 'production' = 'sandbox') {
    this.baseUrl =
      environment === 'production'
        ? 'https://api.facturama.mx'
        : 'https://apisandbox.facturama.mx';

    const authString = Buffer.from(`${username}:${passwordEncrypted}`).toString('base64');
    this.authHeader = `Basic ${authString}`;
  }

  async validateCredentials(): Promise<{ valid: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api-lite/tax-entities`, {
        method: 'GET',
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        return { valid: true, message: 'Credenciales del PAC Facturama validadas correctamente' };
      }

      if (response.status === 401 || response.status === 403) {
        return { valid: false, message: 'Usuario o contraseña del PAC incorrectos' };
      }

      const bodyText = await response.text();
      return { valid: false, message: `Error del PAC (${response.status}): ${bodyText}` };
    } catch (e: any) {
      this.logger.error(`Error al conectar con Facturama: ${e.message}`);
      return { valid: false, message: `No se pudo conectar con el PAC: ${e.message}` };
    }
  }

  async stamp(payload: CfdiPayload): Promise<PacStampResult> {
    this.logger.log(`[FacturamaPac] Enviando CFDI a timbrar: Serie ${payload.serie}, Folio ${payload.folio}, Total: $${payload.total}`);

    // Mapeo al modelo JSON de Facturama API v3 para CFDI 4.0
    const facturamaBody: Record<string, any> = {
      CfdiType: 'I',
      PaymentForm: payload.formaPago,
      PaymentMethod: payload.metodoPago,
      ExpeditionPlace: payload.lugarExpedicion,
      Currency: payload.moneda,
      Series: payload.serie,
      Folio: payload.folio,
      Exportation: payload.exportacion,
      Issuer: {
        Rfc: payload.emisor.rfc,
        Name: payload.emisor.nombre,
        FiscalRegime: payload.emisor.regimenFiscal,
      },
      Receiver: {
        Rfc: payload.receptor.rfc,
        Name: payload.receptor.nombre,
        FiscalRegime: payload.receptor.regimenFiscalReceptor,
        TaxZipCode: payload.receptor.domicilioFiscalReceptor,
        CfdiUse: payload.receptor.usoCFDI,
      },
      Items: payload.conceptos.map((c) => {
        const taxes = (c.impuestos?.traslados ?? []).map((t) => ({
          Total: t.importe,
          Name: 'IVA',
          Base: t.base,
          Rate: t.tasaOCuota,
          IsRetention: false,
        }));

        return {
          ProductCode: c.claveProdServ,
          IdentificationNumber: c.noIdentificacion,
          Description: c.descripcion,
          Unit: c.unidad,
          UnitCode: c.claveUnidad,
          UnitPrice: c.valorUnitario,
          Quantity: c.cantidad,
          Subtotal: c.importe,
          TaxObject: c.objetoImp,
          Taxes: taxes.length > 0 ? taxes : undefined,
        };
      }),
    };

    if (payload.informacionGlobal) {
      facturamaBody.GlobalInformation = {
        Periodicity: payload.informacionGlobal.periodicidad,
        Months: payload.informacionGlobal.meses,
        Year: payload.informacionGlobal.año,
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/3/cfdis`, {
        method: 'POST',
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(facturamaBody),
        signal: AbortSignal.timeout(15000),
      });

      const resJson: any = await response.json();

      if (!response.ok) {
        const errorDetail =
          resJson?.Message ||
          resJson?.ModelState
            ? JSON.stringify(resJson.ModelState)
            : 'Error en la respuesta del PAC';
        this.logger.error(`[FacturamaPac] Error de timbrado: ${errorDetail}`);
        throw new HttpException(
          `Error de certificación SAT (${response.status}): ${errorDetail}`,
          HttpStatus.BAD_GATEWAY
        );
      }

      const uuid = (resJson.Complement?.TaxStamp?.Uuid || resJson.Id || '').toUpperCase();
      const fechaTimbradoStr = resJson.Complement?.TaxStamp?.Date || resJson.Date;
      const fechaTimbrado = fechaTimbradoStr ? new Date(fechaTimbradoStr) : new Date();

      // Obtener el XML timbrado oficial desde Facturama
      let xmlContent = '';
      try {
        const xmlRes = await fetch(`${this.baseUrl}/3/cfdis/${resJson.Id}/xml`, {
          headers: { Authorization: this.authHeader },
          signal: AbortSignal.timeout(10000),
        });
        if (xmlRes.ok) {
          const xmlData: any = await xmlRes.json();
          xmlContent = Buffer.from(xmlData?.Content || '', 'base64').toString('utf8');
        }
      } catch (err) {
        this.logger.warn(`No se pudo descargar el XML de Facturama de forma inmediata: ${err}`);
      }

      return {
        success: true,
        uuid,
        fechaTimbrado,
        noCertificadoSAT: resJson.Complement?.TaxStamp?.SatCertNumber,
        noCertificadoEmisor: resJson.CertNumber,
        selloCFD: resJson.Complement?.TaxStamp?.CfdiSign,
        selloSAT: resJson.Complement?.TaxStamp?.SatSign,
        xmlContent,
        qrCodeUrl: resJson.Complement?.TaxStamp?.QrCode,
      };
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      this.logger.error(`[FacturamaPac] Excepción de conexión: ${e.message}`);
      throw new HttpException(
        `Fallo de comunicación con el PAC Facturama: ${e.message}`,
        HttpStatus.GATEWAY_TIMEOUT
      );
    }
  }

  async cancel(
    uuid: string,
    reason: '01' | '02' | '03' | '04',
    replacementUuid?: string
  ): Promise<PacCancelResult> {
    try {
      let url = `${this.baseUrl}/api-lite/cfdis/${uuid}?type=issued&motive=${reason}`;
      if (reason === '01' && replacementUuid) {
        url += `&uuidReplacement=${replacementUuid}`;
      }

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(15000),
      });

      const resJson: any = await response.json();

      if (!response.ok) {
        const msg = resJson?.Message || 'No se pudo procesar la cancelación en el PAC';
        return {
          success: false,
          uuid,
          status: 'error',
          message: msg,
        };
      }

      return {
        success: true,
        uuid,
        status: 'cancelled',
        message: resJson?.Message || 'Cancelación aceptada por el SAT',
        satStatusCode: resJson?.Status,
      };
    } catch (e: any) {
      return {
        success: false,
        uuid,
        status: 'error',
        message: `Error al cancelar en Facturama: ${e.message}`,
      };
    }
  }

  async getStatus(uuid: string, _rfcEmisor: string, _rfcReceptor: string, _total: number): Promise<PacStatusResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api-lite/cfdis/${uuid}`, {
        headers: { Authorization: this.authHeader },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return { uuid, status: 'no_encontrado', isCancellable: false };
      }

      const resJson: any = await response.json();
      const statusStr = (resJson?.Status || '').toLowerCase();
      const isCancelled = statusStr === 'cancelado' || statusStr === 'cancelled';

      return {
        uuid,
        status: isCancelled ? 'cancelado' : 'vigente',
        isCancellable: resJson?.IsCancelable ?? true,
        cancellationStatus: resJson?.CancellationStatus,
      };
    } catch {
      return { uuid, status: 'vigente', isCancellable: true };
    }
  }
}
