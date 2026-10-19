import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  IPacProvider,
  CfdiPayload,
  PacStampResult,
  PacCancelResult,
  PacStatusResult,
} from './pac-provider.interface';

/**
 * Adaptador Sandbox Autónomo para Pruebas Locales de CFDI 4.0
 * Genera estructuras XML válidas conforme al Anexo 20 del SAT,
 * con Timbre Fiscal Digital (TFD 1.1), sellos digitales criptográficos simulados
 * y gestión de ciclo de vida completo (timbrado, consulta, cancelación con motivos SAT).
 */
@Injectable()
export class MockSandboxPacAdapter implements IPacProvider {
  readonly providerName = 'mock_sandbox';
  private readonly logger = new Logger(MockSandboxPacAdapter.name);

  // Almacén en memoria de folios timbrados para verificación de estado y cancelación en tests
  private readonly stampedInvoices = new Map<string, { status: 'vigente' | 'cancelado'; stampedAt: Date; payload: CfdiPayload }>();

  async validateCredentials(): Promise<{ valid: boolean; message: string }> {
    return {
      valid: true,
      message: 'Conexión exitosa con el ambiente de pruebas simulado del PAC (CFDI 4.0)',
    };
  }

  async stamp(payload: CfdiPayload): Promise<PacStampResult> {
    this.logger.log(`[MockSandboxPac] Procesando timbrado de CFDI Serie: ${payload.serie}, Folio: ${payload.folio}, Total: $${payload.total}`);

    // Generar UUID versión 4 oficial (36 caracteres en mayúsculas)
    const uuid = crypto.randomUUID().toUpperCase();
    const fechaTimbrado = new Date();
    const fechaTimbradoIso = fechaTimbrado.toISOString().replace(/\.\d{3}Z$/, '');

    const noCertificadoSAT = '00001000000504465028';
    const noCertificadoEmisor = '30001000000500003416';
    const selloCFD = crypto.createHash('sha256').update(`${uuid}|${payload.total}|${payload.emisor.rfc}`).digest('base64');
    const selloSAT = crypto.createHash('sha256').update(`${uuid}|SAT|${fechaTimbradoIso}`).digest('base64');
    const rfcProvCertif = 'SAT970701NN3';

    // Generar XML conforme al estándar CFDI 4.0 y TFD 1.1
    const xmlContent = this.generateCfdi40Xml(
      payload,
      uuid,
      fechaTimbradoIso,
      noCertificadoSAT,
      noCertificadoEmisor,
      selloCFD,
      selloSAT,
      rfcProvCertif
    );

    // Guardar para consultas y cancelaciones posteriores
    this.stampedInvoices.set(uuid, {
      status: 'vigente',
      stampedAt: fechaTimbrado,
      payload,
    });

    const qrCodeUrl = `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${uuid}&re=${payload.emisor.rfc}&rr=${payload.receptor.rfc}&tt=${payload.total.toFixed(2)}&fe=${selloCFD.substring(selloCFD.length - 8)}`;

    return {
      success: true,
      uuid,
      fechaTimbrado,
      noCertificadoSAT,
      noCertificadoEmisor,
      selloCFD,
      selloSAT,
      cadenaOriginalSAT: `||1.1|${uuid}|${fechaTimbradoIso}|${rfcProvCertif}|${selloCFD}|${noCertificadoSAT}||`,
      xmlContent,
      qrCodeUrl,
    };
  }

  async cancel(
    uuid: string,
    reason: '01' | '02' | '03' | '04',
    replacementUuid?: string
  ): Promise<PacCancelResult> {
    this.logger.log(`[MockSandboxPac] Solicitando cancelación de UUID: ${uuid}, Motivo: ${reason}, Sustitución: ${replacementUuid ?? 'N/A'}`);

    const record = this.stampedInvoices.get(uuid);
    if (!record) {
      // Incluso si no está en la memoria actual (ej. reinicio de proceso), se permite la cancelación en sandbox
      return {
        success: true,
        uuid,
        status: 'cancelled',
        message: 'Comprobante cancelado exitosamente ante el SAT (Sandbox)',
        satStatusCode: '201',
      };
    }

    record.status = 'cancelado';
    return {
      success: true,
      uuid,
      status: 'cancelled',
      message: 'Comprobante fiscal cancelado satisfactoriamente ante el SAT',
      satStatusCode: '201',
    };
  }

  async getStatus(uuid: string, _rfcEmisor: string, _rfcReceptor: string, _total: number): Promise<PacStatusResult> {
    const record = this.stampedInvoices.get(uuid);
    return {
      uuid,
      status: record?.status ?? 'vigente',
      isCancellable: true,
      cancellationStatus: record?.status === 'cancelado' ? 'Cancelado sin aceptación' : undefined,
    };
  }

  private generateCfdi40Xml(
    p: CfdiPayload,
    uuid: string,
    fechaTimbradoIso: string,
    noCertificadoSAT: string,
    noCertificadoEmisor: string,
    selloCFD: string,
    selloSAT: string,
    rfcProvCertif: string
  ): string {
    const infoGlobalXml = p.informacionGlobal
      ? `  <cfdi:InformacionGlobal Periodicidad="${p.informacionGlobal.periodicidad}" Meses="${p.informacionGlobal.meses}" Año="${p.informacionGlobal.año}"/>\n`
      : '';

    const conceptosXml = p.conceptos
      .map((c) => {
        let impuestosConcepto = '';
        if (c.impuestos?.traslados && c.impuestos.traslados.length > 0) {
          const trasladosXml = c.impuestos.traslados
            .map(
              (t) =>
                `        <cfdi:Traslado Base="${t.base.toFixed(2)}" Impuesto="${t.impuesto}" TipoFactor="${t.tipoFactor}" TasaOCuota="${t.tasaOCuota.toFixed(6)}" Importe="${t.importe.toFixed(2)}"/>`
            )
            .join('\n');
          impuestosConcepto = `      <cfdi:Impuestos>\n        <cfdi:Traslados>\n${trasladosXml}\n        </cfdi:Traslados>\n      </cfdi:Impuestos>\n`;
        }

        const noIdent = c.noIdentificacion ? ` NoIdentificacion="${this.escapeXml(c.noIdentificacion)}"` : '';
        const desc = c.descuento ? ` Descuento="${c.descuento.toFixed(2)}"` : '';

        return `    <cfdi:Concepto ClaveProdServ="${c.claveProdServ}"${noIdent} Cantidad="${c.cantidad}" ClaveUnidad="${c.claveUnidad}" Unidad="${this.escapeXml(c.unidad)}" Descripcion="${this.escapeXml(c.descripcion)}" ValorUnitario="${c.valorUnitario.toFixed(2)}" Importe="${c.importe.toFixed(2)}"${desc} ObjetoImp="${c.objetoImp}">\n${impuestosConcepto}    </cfdi:Concepto>`;
      })
      .join('\n');

    let impuestosTotalesXml = '';
    if (p.impuestos && p.impuestos.traslados && p.impuestos.traslados.length > 0) {
      const trasladosXml = p.impuestos.traslados
        .map(
          (t) =>
            `      <cfdi:Traslado Base="${t.base.toFixed(2)}" Impuesto="${t.impuesto}" TipoFactor="${t.tipoFactor}" TasaOCuota="${t.tasaOCuota.toFixed(6)}" Importe="${t.importe.toFixed(2)}"/>`
        )
        .join('\n');
      impuestosTotalesXml = `  <cfdi:Impuestos TotalImpuestosTrasladados="${p.impuestos.totalImpuestosTrasladados.toFixed(2)}">\n    <cfdi:Traslados>\n${trasladosXml}\n    </cfdi:Traslados>\n  </cfdi:Impuestos>\n`;
    }

    return `<?xml version="1.0" encoding="utf-8"?>
<cfdi:Comprobante xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd" Version="4.0" Serie="${p.serie}" Folio="${p.folio}" Fecha="${p.fecha}" Sello="${selloCFD}" FormaPago="${p.formaPago}" NoCertificado="${noCertificadoEmisor}" SubTotal="${p.subtotal.toFixed(2)}" Moneda="${p.moneda}" Total="${p.total.toFixed(2)}" TipoDeComprobante="${p.tipoDeComprobante}" Exportacion="${p.exportacion}" MetodoPago="${p.metodoPago}" LugarExpedicion="${p.lugarExpedicion}">
${infoGlobalXml}  <cfdi:Emisor Rfc="${p.emisor.rfc}" Nombre="${this.escapeXml(p.emisor.nombre)}" RegimenFiscal="${p.emisor.regimenFiscal}"/>
  <cfdi:Receptor Rfc="${p.receptor.rfc}" Nombre="${this.escapeXml(p.receptor.nombre)}" DomicilioFiscalReceptor="${p.receptor.domicilioFiscalReceptor}" RegimenFiscalReceptor="${p.receptor.regimenFiscalReceptor}" UsoCFDI="${p.receptor.usoCFDI}"/>
  <cfdi:Conceptos>
${conceptosXml}
  </cfdi:Conceptos>
${impuestosTotalesXml}  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" xsi:schemaLocation="http://www.sat.gob.mx/TimbreFiscalDigital http://www.sat.gob.mx/sitio_internet/cfd/TimbreFiscalDigital/TimbreFiscalDigitalv11.xsd" Version="1.1" UUID="${uuid}" FechaTimbrado="${fechaTimbradoIso}" RfcProvCertif="${rfcProvCertif}" SelloCFD="${selloCFD}" NoCertificadoSAT="${noCertificadoSAT}" SelloSAT="${selloSAT}"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;
  }

  private escapeXml(unsafe: string): string {
    return (unsafe ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
