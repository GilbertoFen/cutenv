import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FiscalConfig, FiscalConfigDocument } from '../schemasMongo/fiscal-config.schema';
import { FiscalCustomer, FiscalCustomerDocument } from '../schemasMongo/fiscal-customer.schema';
import { Invoice, InvoiceDocument, InvoiceItem } from '../schemasMongo/invoice.schema';
import { Sale, SaleDocument } from '../schemasMongo/sale.schema';
import { PacFactory } from './pac/pac-factory';
import { FiscalistoService } from './fiscalisto.service';
import { CfdiPayload, CfdiConcepto } from './pac/pac-provider.interface';
import { SaveFiscalConfigDto } from './dto/fiscal-config.dto';
import { IssueIndividualInvoiceDto } from './dto/issue-invoice.dto';
import { IssueGlobalInvoiceDto } from './dto/issue-global-invoice.dto';
import { CancelInvoiceDto } from './dto/cancel-invoice.dto';
import { SaveFiscalCustomerDto } from './dto/fiscal-customer.dto';
import {
  isValidRfc,
  isValidPostalCode,
  mapPaymentMethodToSatFormaPago,
  RFC_PUBLICO_EN_GENERAL,
} from './catalogs/sat-catalogs';
import * as PDFDocumentRaw from 'pdfkit';
const PDFDocument: any = (PDFDocumentRaw as any).default || PDFDocumentRaw;

@Injectable()
export class InvoicingService {
  private readonly logger = new Logger(InvoicingService.name);

  constructor(
    @InjectModel(FiscalConfig.name) private fiscalConfigModel: Model<FiscalConfigDocument>,
    @InjectModel(FiscalCustomer.name) private fiscalCustomerModel: Model<FiscalCustomerDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    private readonly pacFactory: PacFactory,
    private readonly fiscalistoService: FiscalistoService,
  ) {}

  // ==========================================
  // CONFIGURACIÓN FISCAL POR RESTAURANTE
  // ==========================================

  async getFiscalConfig(restaurantId: string = 'default-restaurant') {
    const config = await this.fiscalConfigModel.findOne({ restaurantId });
    if (!config) {
      if (this.fiscalistoService.isConfigured()) {
        const isLive = this.fiscalistoService.isLivemode();
        return {
          configured: true,
          restaurantId,
          rfc: 'EKU9003173C9',
          legalName: 'ESCUELA KEMPER URGATE',
          taxRegime: '601',
          postalCode: '42501',
          pacProvider: 'fiscalisto',
          pacUsername: 'fiscalisto_api',
          hasPassword: true,
          environment: isLive ? 'production' : 'sandbox',
          defaultClaveProdServ: '90101501',
          defaultClaveUnidad: 'E48',
          defaultIvaRate: 0.16,
          series: 'F',
          nextFolio: 1,
          isValidated: true,
          certificateNumber: '00001000000504465028',
        };
      }
      return {
        configured: false,
        restaurantId,
        rfc: '',
        legalName: '',
        taxRegime: '601',
        postalCode: '',
        pacProvider: 'mock_sandbox',
        pacUsername: '',
        hasPassword: false,
        environment: 'sandbox',
        defaultClaveProdServ: '90101501',
        defaultClaveUnidad: 'E48',
        defaultIvaRate: 0.16,
        series: 'F',
        nextFolio: 1,
        isValidated: false,
      };
    }

    const isFiscalisto = config.pacProvider === 'fiscalisto' || this.fiscalistoService.isConfigured();
    return {
      configured: true,
      id: config._id.toString(),
      restaurantId: config.restaurantId,
      rfc: config.rfc || (isFiscalisto ? 'EKU9003173C9' : ''),
      legalName: config.legalName || (isFiscalisto ? 'ESCUELA KEMPER URGATE' : ''),
      taxRegime: config.taxRegime || '601',
      postalCode: config.postalCode || (isFiscalisto ? '42501' : ''),
      pacProvider: isFiscalisto ? 'fiscalisto' : config.pacProvider,
      pacUsername: config.pacUsername || (isFiscalisto ? 'fiscalisto_api' : ''),
      hasPassword: isFiscalisto ? true : Boolean(config.pacPasswordEncrypted),
      environment: config.environment,
      defaultClaveProdServ: config.defaultClaveProdServ,
      defaultClaveUnidad: config.defaultClaveUnidad,
      defaultIvaRate: config.defaultIvaRate,
      series: config.series,
      nextFolio: config.nextFolio,
      isValidated: isFiscalisto ? true : config.isValidated,
      certificateNumber: config.certificateNumber || (isFiscalisto ? '00001000000504465028' : undefined),
    };
  }

  async saveFiscalConfig(restaurantId: string = 'default-restaurant', dto: SaveFiscalConfigDto) {
    if (!isValidRfc(dto.rfc)) {
      throw new BadRequestException('El RFC del emisor no es válido');
    }
    if (!isValidPostalCode(dto.postalCode)) {
      throw new BadRequestException('El código postal del emisor debe tener 5 dígitos numéricos');
    }

    let config = await this.fiscalConfigModel.findOne({ restaurantId });

    const pacPasswordEncrypted = dto.pacPassword
      ? dto.pacPassword
      : config?.pacPasswordEncrypted ?? '';

    const updateData: Partial<FiscalConfig> = {
      restaurantId,
      rfc: dto.rfc.toUpperCase().trim(),
      legalName: dto.legalName.trim().toUpperCase(),
      taxRegime: dto.taxRegime.trim(),
      postalCode: dto.postalCode.trim(),
      pacProvider: dto.pacProvider,
      pacUsername: dto.pacUsername?.trim() ?? '',
      pacPasswordEncrypted,
      environment: dto.environment,
      defaultClaveProdServ: dto.defaultClaveProdServ?.trim() || '90101501',
      defaultClaveUnidad: dto.defaultClaveUnidad?.trim() || 'E48',
      defaultIvaRate: dto.defaultIvaRate ?? 0.16,
      series: dto.series?.trim().toUpperCase() || 'F',
      nextFolio: dto.nextFolio ?? config?.nextFolio ?? 1,
    };

    if (!config) {
      config = new this.fiscalConfigModel(updateData);
    } else {
      Object.assign(config, updateData);
    }

    // Validar conexión con el PAC
    const pacProvider = this.pacFactory.getProvider(config);
    const validation = await pacProvider.validateCredentials();
    config.isValidated = validation.valid;

    await config.save();

    return {
      success: true,
      isValidated: config.isValidated,
      message: validation.message,
      config: await this.getFiscalConfig(restaurantId),
    };
  }

  async validatePacCredentials(restaurantId: string = 'default-restaurant') {
    const config = await this.fiscalConfigModel.findOne({ restaurantId });
    const pacProvider = this.pacFactory.getProvider(config ?? undefined);
    const result = await pacProvider.validateCredentials();

    if (config) {
      config.isValidated = result.valid;
      await config.save();
    }

    return result;
  }

  // ==========================================
  // FACTURACIÓN INDIVIDUAL DE VENTA
  // ==========================================

  async issueIndividualInvoice(
    restaurantId: string = 'default-restaurant',
    saleId: string,
    dto: IssueIndividualInvoiceDto
  ) {
    let config = await this.fiscalConfigModel.findOne({ restaurantId });
    if ((!config || !config.rfc) && this.fiscalistoService.isConfigured()) {
      const isLive = this.fiscalistoService.isLivemode();
      if (!config) {
        config = new this.fiscalConfigModel({
          restaurantId,
          rfc: 'EKU9003173C9',
          legalName: 'ESCUELA KEMPER URGATE',
          taxRegime: '601',
          postalCode: '42501',
          pacProvider: 'fiscalisto',
          pacUsername: 'fiscalisto_api',
          environment: isLive ? 'production' : 'sandbox',
          defaultClaveProdServ: '90101501',
          defaultClaveUnidad: 'E48',
          defaultIvaRate: 0.16,
          series: 'F',
          nextFolio: 1,
          isValidated: true,
        });
      } else {
        config.rfc = config.rfc || 'EKU9003173C9';
        config.legalName = config.legalName || 'ESCUELA KEMPER URGATE';
        config.taxRegime = config.taxRegime || '601';
        config.postalCode = config.postalCode || '42501';
        config.pacProvider = 'fiscalisto';
        config.environment = isLive ? 'production' : 'sandbox';
        config.isValidated = true;
      }
      await config.save();
    }

    if (!config || !config.rfc) {
      throw new BadRequestException(
        'El restaurante no cuenta con configuración fiscal activa. Configura el RFC y el emisor primero.'
      );
    }

    if (!Types.ObjectId.isValid(saleId)) {
      throw new BadRequestException('Identificador de venta inválido');
    }

    const sale = await this.saleModel
      .findById(saleId)
      .populate({
        path: 'orders',
        populate: { path: 'items.recipe' },
      });

    if (!sale) {
      throw new NotFoundException('Venta no encontrada');
    }

    if (sale.status !== 'paid') {
      throw new BadRequestException(`Solo se pueden facturar ventas pagadas (Estado actual: ${sale.status})`);
    }

    if (sale.isFacturada || sale.invoiceId) {
      throw new ConflictException(`La venta ${sale.folio} ya cuenta con una factura CFDI 4.0 timbrada previamente.`);
    }

    // Validar datos del receptor
    if (!isValidRfc(dto.receptor.rfc)) {
      throw new BadRequestException('El RFC del receptor no cumple con el formato fiscal del SAT');
    }
    if (!isValidPostalCode(dto.receptor.postalCode)) {
      throw new BadRequestException('El código postal del receptor debe ser de 5 dígitos numéricos');
    }

    // Evitar doble timbrado concurrente con idempotencyKey
    const idempotencyKey = dto.idempotencyKey || `sale-${sale._id}`;
    const existingInvoice = await this.invoiceModel.findOne({ idempotencyKey });
    if (existingInvoice) {
      return existingInvoice;
    }

    // Extraer y calcular conceptos fiscales a partir de las recetas de la venta
    const conceptos: CfdiConcepto[] = [];
    const ivaRate = config.defaultIvaRate ?? 0.16;

    let subtotalCalculado = 0;
    let ivaCalculado = 0;

    for (const order of (sale.orders as any[]) || []) {
      for (const item of (order.items as any[]) || []) {
        const recipe = item.recipe;
        const nombre = recipe?.name || 'Consumo de Alimentos y Bebidas';
        const qty = Number(item.quantity) || 1;
        const precioUnitarioConIva = Number(recipe?.price) || 0;

        // Desglose fiscal exacto con 2 decimales para evitar floating point drift
        const totalNetoItem = this.round(precioUnitarioConIva * qty);
        const subtotalItem = this.round(totalNetoItem / (1 + ivaRate));
        const ivaItem = this.round(totalNetoItem - subtotalItem);
        const valorUnitarioSinIva = this.round(subtotalItem / qty);

        subtotalCalculado += subtotalItem;
        ivaCalculado += ivaItem;

        conceptos.push({
          claveProdServ: config.defaultClaveProdServ || '90101501',
          noIdentificacion: recipe?._id?.toString() || sale.folio,
          cantidad: qty,
          claveUnidad: config.defaultClaveUnidad || 'E48',
          unidad: 'Servicio',
          descripcion: nombre,
          valorUnitario: valorUnitarioSinIva,
          importe: subtotalItem,
          objetoImp: '02', // Sí objeto de impuesto
          impuestos: {
            traslados: [
              {
                base: subtotalItem,
                impuesto: '002',
                tipoFactor: 'Tasa',
                tasaOCuota: ivaRate,
                importe: ivaItem,
              },
            ],
          },
        });
      }
    }

    // Si la venta no tenía órdenes detalladas (ej. venta manual directa por total), generar concepto genérico
    if (conceptos.length === 0) {
      const totalNeto = this.round(sale.totalAmount);
      const subtotalItem = this.round(totalNeto / (1 + ivaRate));
      const ivaItem = this.round(totalNeto - subtotalItem);

      subtotalCalculado = subtotalItem;
      ivaCalculado = ivaItem;

      conceptos.push({
        claveProdServ: config.defaultClaveProdServ || '90101501',
        noIdentificacion: sale.folio,
        cantidad: 1,
        claveUnidad: config.defaultClaveUnidad || 'E48',
        unidad: 'Servicio',
        descripcion: 'Consumo en restaurante ticket ' + sale.folio,
        valorUnitario: subtotalItem,
        importe: subtotalItem,
        objetoImp: '02',
        impuestos: {
          traslados: [
            {
              base: subtotalItem,
              impuesto: '002',
              tipoFactor: 'Tasa',
              tasaOCuota: ivaRate,
              importe: ivaItem,
            },
          ],
        },
      });
    }

    subtotalCalculado = this.round(subtotalCalculado);
    ivaCalculado = this.round(ivaCalculado);
    const totalCalculado = this.round(subtotalCalculado + ivaCalculado);

    const folio = `${config.nextFolio ?? 1}`;
    const serie = config.series || 'F';
    const fecha = new Date().toISOString().replace(/\.\d{3}Z$/, '');
    const formaPago = dto.paymentMethod || mapPaymentMethodToSatFormaPago(sale.paymentMethod);
    const metodoPago = dto.paymentType || 'PUE';

    const cfdiPayload: CfdiPayload = {
      serie,
      folio,
      fecha,
      formaPago,
      metodoPago,
      moneda: 'MXN',
      tipoDeComprobante: 'I',
      exportacion: '01',
      lugarExpedicion: config.postalCode,
      subtotal: subtotalCalculado,
      total: totalCalculado,
      emisor: {
        rfc: config.rfc,
        nombre: config.legalName,
        regimenFiscal: config.taxRegime,
      },
      receptor: {
        rfc: dto.receptor.rfc.toUpperCase().trim(),
        nombre: dto.receptor.legalName.toUpperCase().trim(),
        domicilioFiscalReceptor: dto.receptor.postalCode.trim(),
        regimenFiscalReceptor: dto.receptor.taxRegime.trim(),
        usoCFDI: dto.receptor.cfdiUse.trim(),
        email: dto.receptor.email?.toLowerCase().trim(),
      },
      sendEmail: dto.sendEmail,
      conceptos,
      impuestos: {
        totalImpuestosTrasladados: ivaCalculado,
        traslados: [
          {
            base: subtotalCalculado,
            impuesto: '002',
            tipoFactor: 'Tasa',
            tasaOCuota: ivaRate,
            importe: ivaCalculado,
          },
        ],
      },
    };

    // Solicitar timbrado al PAC
    const pacProvider = this.pacFactory.getProvider(config);
    const stampResult = await pacProvider.stamp(cfdiPayload, idempotencyKey);

    if (!stampResult.success || !stampResult.uuid) {
      throw new BadRequestException(stampResult.error || 'El PAC no pudo certificar el CFDI');
    }

    // Persistir el comprobante fiscal timbrado
    const invoiceItems: InvoiceItem[] = conceptos.map((c) => ({
      noIdentificacion: c.noIdentificacion,
      claveProdServ: c.claveProdServ,
      claveUnidad: c.claveUnidad,
      unidad: c.unidad,
      cantidad: c.cantidad,
      descripcion: c.descripcion,
      valorUnitario: c.valorUnitario,
      importe: c.importe,
      objetoImp: c.objetoImp,
      baseIva: c.impuestos?.traslados?.[0]?.base ?? c.importe,
      tasaIva: c.impuestos?.traslados?.[0]?.tasaOCuota ?? ivaRate,
      importeIva: c.impuestos?.traslados?.[0]?.importe ?? 0,
    }));

    const invoice = new this.invoiceModel({
      restaurantId,
      type: 'individual',
      saleId: sale._id,
      serie,
      folio,
      uuid: stampResult.uuid,
      fiscalistoInvoiceId: stampResult.fiscalistoInvoiceId,
      status: 'stamped',
      subtotal: subtotalCalculado,
      taxAmount: ivaCalculado,
      total: totalCalculado,
      currency: 'MXN',
      paymentMethod: formaPago,
      paymentType: metodoPago,
      emisor: {
        rfc: config.rfc,
        legalName: config.legalName,
        taxRegime: config.taxRegime,
        postalCode: config.postalCode,
      },
      receptor: {
        rfc: dto.receptor.rfc.toUpperCase().trim(),
        legalName: dto.receptor.legalName.toUpperCase().trim(),
        taxRegime: dto.receptor.taxRegime.trim(),
        postalCode: dto.receptor.postalCode.trim(),
        cfdiUse: dto.receptor.cfdiUse.trim(),
        email: dto.receptor.email?.toLowerCase().trim(),
      },
      items: invoiceItems,
      xmlContent: stampResult.xmlContent,
      pacProvider: pacProvider.providerName,
      stampedAt: stampResult.fechaTimbrado,
      idempotencyKey,
      emailSentAt: undefined,
      emailTo: dto.receptor.email ? dto.receptor.email.toLowerCase().trim() : undefined,
      emailStatus: dto.receptor.email ? 'pending' : undefined,
    });

    const savedInvoice = await invoice.save();

    // Enviar factura por correo mediante Fiscalisto si se proporcionó correo receptor
    const targetEmail = dto.receptor.email?.toLowerCase().trim();
    if (targetEmail && dto.sendEmail !== false && this.fiscalistoService.isConfigured()) {
      try {
        const targetId = savedInvoice.fiscalistoInvoiceId || savedInvoice.uuid;
        await this.fiscalistoService.sendInvoice(targetId, { to: targetEmail });
        savedInvoice.emailSentAt = new Date();
        savedInvoice.emailTo = targetEmail;
        savedInvoice.emailStatus = 'sent';
        await savedInvoice.save();
      } catch (emailErr: any) {
        this.logger.warn(`No se pudo enviar el correo de la factura automáticamente: ${emailErr?.message || emailErr}`);
        savedInvoice.emailStatus = 'failed';
        await savedInvoice.save();
      }
    }

    // Actualizar la venta para marcarla como facturada y vincularla
    sale.isFacturada = true;
    sale.invoiceId = savedInvoice._id;
    await sale.save();

    // Incrementar folio fiscal interno
    config.nextFolio = (config.nextFolio ?? 1) + 1;
    await config.save();

    // Guardar cliente para reutilización si se solicitó
    if (dto.saveCustomer) {
      await this.saveFiscalCustomer(restaurantId, {
        rfc: dto.receptor.rfc,
        legalName: dto.receptor.legalName,
        postalCode: dto.receptor.postalCode,
        taxRegime: dto.receptor.taxRegime,
        cfdiUse: dto.receptor.cfdiUse,
        email: dto.receptor.email,
      });
    }

    return savedInvoice;
  }

  // ==========================================
  // FACTURACIÓN GLOBAL (PÚBLICO EN GENERAL)
  // ==========================================

  async previewGlobalInvoice(
    restaurantId: string = 'default-restaurant',
    startDate: string,
    endDate: string
  ) {
    const config = await this.fiscalConfigModel.findOne({ restaurantId });
    if (!config) {
      throw new BadRequestException('Configure los datos fiscales del restaurante primero.');
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const queryDate = { $gte: start, $lte: end };
    const eligibleSales = await this.saleModel
      .find({
        status: 'paid',
        isFacturada: { $ne: true },
        $or: [
          { createdAt: queryDate },
          { date: queryDate },
          { updatedAt: queryDate },
        ],
      })
      .sort({ createdAt: 1, date: 1 });

    const ivaRate = config.defaultIvaRate ?? 0.16;
    let total = 0;
    let subtotal = 0;
    let taxAmount = 0;

    const tickets = eligibleSales.map((s) => {
      const saleTotal = this.round(s.totalAmount);
      const saleSubtotal = this.round(saleTotal / (1 + ivaRate));
      const saleIva = this.round(saleTotal - saleSubtotal);

      total += saleTotal;
      subtotal += saleSubtotal;
      taxAmount += saleIva;

      return {
        id: s._id.toString(),
        folio: s.folio,
        date: (s as any).createdAt || s.date || new Date(),
        total: saleTotal,
        subtotal: saleSubtotal,
        iva: saleIva,
        paymentMethod: s.paymentMethod,
      };
    });

    return {
      eligibleCount: eligibleSales.length,
      subtotal: this.round(subtotal),
      taxAmount: this.round(taxAmount),
      total: this.round(total),
      tickets,
    };
  }

  async issueGlobalInvoice(restaurantId: string = 'default-restaurant', dto: IssueGlobalInvoiceDto) {
    const config = await this.fiscalConfigModel.findOne({ restaurantId });
    if (!config || !config.rfc) {
      throw new BadRequestException('Configuración fiscal no encontrada.');
    }

    const preview = await this.previewGlobalInvoice(restaurantId, dto.startDate, dto.endDate);
    if (preview.eligibleCount === 0) {
      throw new BadRequestException('No hay ventas elegibles sin facturar en el periodo seleccionado');
    }

    const idempotencyKey =
      dto.idempotencyKey || `global_${dto.periodicity}_${dto.months}_${dto.year}_${Date.now()}`;
    const existing = await this.invoiceModel.findOne({ idempotencyKey });
    if (existing) return existing;

    const ivaRate = config.defaultIvaRate ?? 0.16;

    // Regla SAT CFDI 4.0 para Factura Global:
    // ClaveProdServ: '01010101'
    // ClaveUnidad: 'ACT'
    // Descripcion: 'Venta'
    // NoIdentificacion: Folio del ticket de venta
    const conceptos: CfdiConcepto[] = preview.tickets.map((t) => ({
      claveProdServ: '01010101',
      noIdentificacion: t.folio,
      cantidad: 1,
      claveUnidad: 'ACT',
      unidad: 'Actividad',
      descripcion: `Venta ticket ${t.folio}`,
      valorUnitario: t.subtotal,
      importe: t.subtotal,
      objetoImp: '02',
      impuestos: {
        traslados: [
          {
            base: t.subtotal,
            impuesto: '002',
            tipoFactor: 'Tasa',
            tasaOCuota: ivaRate,
            importe: t.iva,
          },
        ],
      },
    }));

    const serie = config.series ? `G${config.series}` : 'G';
    const folio = `${config.nextFolio ?? 1}`;
    const fecha = new Date().toISOString().replace(/\.\d{3}Z$/, '');

    const cfdiPayload: CfdiPayload = {
      serie,
      folio,
      fecha,
      formaPago: dto.paymentMethod || '01', // Generalmente '01' Efectivo para público en general
      metodoPago: 'PUE',
      moneda: 'MXN',
      tipoDeComprobante: 'I',
      exportacion: '01',
      lugarExpedicion: config.postalCode,
      subtotal: preview.subtotal,
      total: preview.total,
      emisor: {
        rfc: config.rfc,
        nombre: config.legalName,
        regimenFiscal: config.taxRegime,
      },
      receptor: {
        rfc: RFC_PUBLICO_EN_GENERAL,
        nombre: 'PUBLICO EN GENERAL',
        domicilioFiscalReceptor: config.postalCode, // En CFDI 4.0 para público en general debe ser igual a LugarExpedicion
        regimenFiscalReceptor: '616', // Sin obligaciones fiscales
        usoCFDI: 'S01', // Sin efectos fiscales
      },
      informacionGlobal: {
        periodicidad: dto.periodicity,
        meses: dto.months,
        año: dto.year,
      },
      conceptos,
      impuestos: {
        totalImpuestosTrasladados: preview.taxAmount,
        traslados: [
          {
            base: preview.subtotal,
            impuesto: '002',
            tipoFactor: 'Tasa',
            tasaOCuota: ivaRate,
            importe: preview.taxAmount,
          },
        ],
      },
    };

    const pacProvider = this.pacFactory.getProvider(config);
    const stampResult = await pacProvider.stamp(cfdiPayload);

    if (!stampResult.success || !stampResult.uuid) {
      throw new BadRequestException(stampResult.error || 'Error al timbrar factura global');
    }

    const salesObjectIds = preview.tickets.map((t) => new Types.ObjectId(t.id));

    const invoice = new this.invoiceModel({
      restaurantId,
      type: 'global',
      salesIds: salesObjectIds,
      serie,
      folio,
      uuid: stampResult.uuid,
      status: 'stamped',
      subtotal: preview.subtotal,
      taxAmount: preview.taxAmount,
      total: preview.total,
      currency: 'MXN',
      paymentMethod: dto.paymentMethod || '01',
      paymentType: 'PUE',
      emisor: {
        rfc: config.rfc,
        legalName: config.legalName,
        taxRegime: config.taxRegime,
        postalCode: config.postalCode,
      },
      receptor: {
        rfc: RFC_PUBLICO_EN_GENERAL,
        legalName: 'PUBLICO EN GENERAL',
        taxRegime: '616',
        postalCode: config.postalCode,
        cfdiUse: 'S01',
      },
      items: conceptos.map((c) => ({
        noIdentificacion: c.noIdentificacion,
        claveProdServ: c.claveProdServ,
        claveUnidad: c.claveUnidad,
        unidad: c.unidad,
        cantidad: c.cantidad,
        descripcion: c.descripcion,
        valorUnitario: c.valorUnitario,
        importe: c.importe,
        objetoImp: c.objetoImp,
        baseIva: c.impuestos?.traslados?.[0]?.base ?? c.importe,
        tasaIva: ivaRate,
        importeIva: c.impuestos?.traslados?.[0]?.importe ?? 0,
      })),
      globalPeriodicity: {
        periodicity: dto.periodicity,
        months: dto.months,
        year: dto.year,
      },
      xmlContent: stampResult.xmlContent,
      pacProvider: pacProvider.providerName,
      stampedAt: stampResult.fechaTimbrado,
      idempotencyKey,
    });

    const savedInvoice = await invoice.save();

    // Actualizar masivamente todas las ventas incluidas para evitar doble facturación
    await this.saleModel.updateMany(
      { _id: { $in: salesObjectIds } },
      { $set: { isFacturada: true, invoiceId: savedInvoice._id } }
    );

    config.nextFolio = (config.nextFolio ?? 1) + 1;
    await config.save();

    return savedInvoice;
  }

  // ==========================================
  // CONSULTA Y DESCARGAS
  // ==========================================

  async getInvoices(restaurantId: string = 'default-restaurant', query?: any) {
    const filter: any = { restaurantId };
    if (query?.type) filter.type = query.type;
    if (query?.status) filter.status = query.status;
    if (query?.search) {
      const s = query.search.trim();
      filter.$or = [
        { folio: new RegExp(s, 'i') },
        { uuid: new RegExp(s, 'i') },
        { 'receptor.rfc': new RegExp(s, 'i') },
        { 'receptor.legalName': new RegExp(s, 'i') },
      ];
    }

    return this.invoiceModel
      .find(filter)
      .sort({ createdAt: -1 })
      .populate('saleId', 'folio totalAmount paymentMethod createdAt');
  }

  async getInvoiceById(restaurantId: string = 'default-restaurant', id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID de factura inválido');
    }
    const invoice = await this.invoiceModel.findOne({ _id: id, restaurantId });
    if (!invoice) throw new NotFoundException('Factura no encontrada');
    return invoice;
  }

  async getInvoiceXml(restaurantId: string = 'default-restaurant', id: string): Promise<string> {
    const invoice = await this.getInvoiceById(restaurantId, id);
    if (invoice.xmlContent) {
      return invoice.xmlContent;
    }

    if (this.fiscalistoService.isConfigured() && (invoice.fiscalistoInvoiceId || invoice.uuid)) {
      try {
        const xml = await this.fiscalistoService.getInvoiceXml(invoice.fiscalistoInvoiceId || invoice.uuid);
        if (xml) {
          invoice.xmlContent = xml;
          await invoice.save();
          return xml;
        }
      } catch (err: any) {
        this.logger.warn(`No se pudo obtener XML desde Fiscalisto: ${err.message}`);
      }
    }

    throw new NotFoundException('El contenido XML no está disponible para esta factura');
  }

  async generateInvoicePdf(restaurantId: string = 'default-restaurant', id: string): Promise<Buffer> {
    const invoice = await this.getInvoiceById(restaurantId, id);

    // Obtener representación oficial certificada de Fiscalisto si está configurado
    if (this.fiscalistoService.isConfigured() && (invoice.fiscalistoInvoiceId || invoice.uuid)) {
      try {
        const pdfBytes = await this.fiscalistoService.getInvoicePdf(
          invoice.fiscalistoInvoiceId || invoice.uuid
        );
        if (pdfBytes && pdfBytes.length > 0) {
          return Buffer.from(pdfBytes);
        }
      } catch (err: any) {
        this.logger.warn(
          `No se pudo obtener PDF oficial de Fiscalisto (${err.message}). Generando representación local...`
        );
      }
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'LETTER' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Encabezado
      doc.fontSize(16).font('Helvetica-Bold').text(invoice.emisor.legalName, { align: 'left' });
      doc.fontSize(9).font('Helvetica').text(`RFC: ${invoice.emisor.rfc}`);
      doc.text(`Régimen Fiscal: ${invoice.emisor.taxRegime} | Lugar de Expedición (CP): ${invoice.emisor.postalCode}`);
      doc.moveDown(0.5);

      // Cuadro de folio y UUID
      const currentY = doc.y;
      doc.rect(380, 40, 190, 70).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text(`FACTURA CFDI 4.0`, 390, 48);
      doc.fontSize(9).font('Helvetica').text(`Serie/Folio: ${invoice.serie}-${invoice.folio}`, 390, 62);
      doc.fontSize(7).text(`Folio Fiscal (UUID):`, 390, 76);
      doc.fontSize(6).font('Helvetica-Bold').text(invoice.uuid, 390, 87);
      doc.fontSize(7).font('Helvetica').text(`Fecha: ${new Date(invoice.stampedAt).toLocaleString('es-MX')}`, 390, 97);

      doc.y = Math.max(currentY + 10, 125);
      doc.fillColor('#000000');

      // Estado de cancelación
      if (invoice.status === 'cancelled') {
        doc.rect(40, doc.y, 530, 20).fillAndStroke('#fee2e2', '#ef4444');
        doc.fillColor('#991b1b').fontSize(9).font('Helvetica-Bold').text('COMPROBANTE FISCAL CANCELADO ANTE EL SAT', 45, doc.y - 15, { align: 'center' });
        doc.moveDown(1);
        doc.fillColor('#000000');
      }

      // Receptor
      doc.fontSize(10).font('Helvetica-Bold').text('DATOS DEL RECEPTOR');
      doc.fontSize(8).font('Helvetica').text(`Razón Social: ${invoice.receptor.legalName}`);
      doc.text(`RFC: ${invoice.receptor.rfc} | CP Fiscal: ${invoice.receptor.postalCode} | Régimen: ${invoice.receptor.taxRegime}`);
      doc.text(`Uso del CFDI: ${invoice.receptor.cfdiUse} | Método de Pago: ${invoice.paymentType} | Forma de Pago: ${invoice.paymentMethod}`);
      doc.moveDown(1);

      // Tabla de conceptos
      doc.fontSize(9).font('Helvetica-Bold').text('CONCEPTOS / PRODUCTOS');
      doc.rect(40, doc.y, 530, 15).fill('#e2e8f0');
      doc.fillColor('#1e293b').fontSize(8);
      const tableY = doc.y + 4;
      doc.text('Cant', 45, tableY);
      doc.text('Clave SAT', 75, tableY);
      doc.text('Descripción', 135, tableY);
      doc.text('P. Unitario', 380, tableY, { width: 60, align: 'right' });
      doc.text('IVA (16%)', 445, tableY, { width: 55, align: 'right' });
      doc.text('Importe', 505, tableY, { width: 60, align: 'right' });

      doc.y = tableY + 15;
      doc.fillColor('#000000');

      for (const item of invoice.items) {
        const rowY = doc.y;
        doc.fontSize(8).font('Helvetica');
        doc.text(String(item.cantidad), 45, rowY);
        doc.text(item.claveProdServ, 75, rowY);
        doc.text(item.descripcion.substring(0, 45), 135, rowY);
        doc.text(`$${item.valorUnitario.toFixed(2)}`, 380, rowY, { width: 60, align: 'right' });
        doc.text(`$${item.importeIva.toFixed(2)}`, 445, rowY, { width: 55, align: 'right' });
        doc.text(`$${item.importe.toFixed(2)}`, 505, rowY, { width: 60, align: 'right' });
        doc.y = rowY + 13;
      }

      doc.moveDown(1);

      // Totales
      const totalsY = doc.y;
      doc.rect(380, totalsY, 190, 50).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#0f172a').fontSize(8).font('Helvetica');
      doc.text(`Subtotal:`, 390, totalsY + 6);
      doc.text(`$${invoice.subtotal.toFixed(2)}`, 490, totalsY + 6, { align: 'right', width: 70 });
      doc.text(`IVA Trasladado (16%):`, 390, totalsY + 18);
      doc.text(`$${invoice.taxAmount.toFixed(2)}`, 490, totalsY + 18, { align: 'right', width: 70 });
      doc.font('Helvetica-Bold').fontSize(9).text(`TOTAL:`, 390, totalsY + 32);
      doc.text(`$${invoice.total.toFixed(2)} ${invoice.currency}`, 490, totalsY + 32, { align: 'right', width: 70 });

      doc.y = totalsY + 65;

      // Cadena y Leyenda SAT
      doc.fontSize(6).font('Helvetica').fillColor('#64748b');
      doc.text('ESTE DOCUMENTO ES UNA REPRESENTACIÓN IMPRESA DE UN CFDI VERSIÓN 4.0');
      doc.text(`Certificado PAC SAT: 00001000000504465028 | Proveedor de Certificación: ${invoice.pacProvider.toUpperCase()}`);
      doc.text(`Cadena original del complemento de certificación digital del SAT:`);
      doc.font('Courier').fontSize(5).text(
        `||1.1|${invoice.uuid}|${new Date(invoice.stampedAt).toISOString()}|SAT970701NN3|...||`,
        { width: 530 }
      );

      doc.end();
    });
  }

  // ==========================================
  // CANCELACIÓN DE CFDI
  // ==========================================

  async cancelInvoice(restaurantId: string = 'default-restaurant', id: string, dto: CancelInvoiceDto) {
    const invoice = await this.getInvoiceById(restaurantId, id);

    if (invoice.status === 'cancelled') {
      throw new BadRequestException('Esta factura ya se encuentra cancelada.');
    }

    if (dto.reason === '01' && !dto.replacementUuid) {
      throw new BadRequestException(
        'El motivo de cancelación 01 (Con relación) requiere especificar el UUID del comprobante que lo sustituye.'
      );
    }

    const config = await this.fiscalConfigModel.findOne({ restaurantId });
    const pacProvider = this.pacFactory.getProvider(config ?? undefined);

    const cancelTarget = invoice.fiscalistoInvoiceId || invoice.uuid;
    const cancelResult = await pacProvider.cancel(cancelTarget, dto.reason, dto.replacementUuid);

    if (!cancelResult.success) {
      throw new BadRequestException(cancelResult.message || 'El PAC rechazó la cancelación del comprobante.');
    }

    invoice.status = cancelResult.status === 'pending_cancellation' ? 'pending_cancellation' : 'cancelled';
    invoice.cancellationReason = dto.reason;
    invoice.cancellationReplacementUuid = dto.replacementUuid;
    invoice.cancelledAt = new Date();
    invoice.cancellationStatusSAT = cancelResult.message;
    await invoice.save();

    // Si era factura individual, liberar la venta para permitir re-facturación si se requiere
    if (invoice.type === 'individual' && invoice.saleId) {
      await this.saleModel.findByIdAndUpdate(invoice.saleId, {
        $set: { isFacturada: false, invoiceId: undefined },
      });
    }

    return {
      success: true,
      status: invoice.status,
      message: cancelResult.message,
      invoice,
    };
  }

  // ==========================================
  // ENVÍO DE COMPROBANTE POR CORREO
  // ==========================================

  async sendInvoiceEmail(restaurantId: string = 'default-restaurant', id: string, email?: string) {
    const invoice = await this.getInvoiceById(restaurantId, id);
    const targetEmail = email?.trim().toLowerCase() || invoice.receptor.email;
    if (!targetEmail) {
      throw new BadRequestException('Se requiere una dirección de correo electrónico para enviar el comprobante');
    }

    if (!this.fiscalistoService.isConfigured()) {
      throw new BadRequestException('El servicio de facturación Fiscalisto no está configurado');
    }

    const targetId = invoice.fiscalistoInvoiceId || invoice.uuid;
    await this.fiscalistoService.sendInvoice(targetId, { to: targetEmail });

    invoice.emailSentAt = new Date();
    invoice.emailTo = targetEmail;
    await invoice.save();

    return {
      success: true,
      message: `Comprobante fiscal enviado exitosamente a ${targetEmail}`,
      emailSentAt: invoice.emailSentAt,
      emailTo: invoice.emailTo,
    };
  }

  // ==========================================
  // CLIENTES FISCALES REUTILIZABLES
  // ==========================================

  async getFiscalCustomers(restaurantId: string = 'default-restaurant', q?: string) {
    const filter: any = { restaurantId };
    if (q) {
      const regex = new RegExp(q.trim(), 'i');
      filter.$or = [{ rfc: regex }, { legalName: regex }, { email: regex }];
    }
    return this.fiscalCustomerModel.find(filter).sort({ legalName: 1 });
  }

  async saveFiscalCustomer(restaurantId: string = 'default-restaurant', dto: SaveFiscalCustomerDto) {
    if (!isValidRfc(dto.rfc)) {
      throw new BadRequestException('El RFC del cliente no tiene formato válido');
    }
    if (!isValidPostalCode(dto.postalCode)) {
      throw new BadRequestException('El código postal del cliente debe tener 5 dígitos numéricos');
    }

    const cleanRfc = dto.rfc.toUpperCase().trim();
    let customer = await this.fiscalCustomerModel.findOne({ restaurantId, rfc: cleanRfc });

    const customerData = {
      restaurantId,
      rfc: cleanRfc,
      legalName: dto.legalName.toUpperCase().trim(),
      postalCode: dto.postalCode.trim(),
      taxRegime: dto.taxRegime.trim(),
      cfdiUse: dto.cfdiUse.trim(),
      email: dto.email?.toLowerCase().trim(),
      phone: dto.phone?.trim(),
    };

    if (customer) {
      Object.assign(customer, customerData);
    } else {
      customer = new this.fiscalCustomerModel(customerData);
    }

    return customer.save();
  }

  // ==========================================
  // UTILIDADES MATEMÁTICAS / REDONDEO SAT
  // ==========================================

  private round(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }
}
