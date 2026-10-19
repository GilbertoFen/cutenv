# InvoicingModule - CFDI 4.0 (NestJS)

Módulo desacoplado de facturación electrónica CFDI 4.0 para POS Restaurante México (Anexo 20 SAT).

## Estructura
- `catalogs/sat-catalogs.ts`: Catálogos oficiales SAT (`c_RegimenFiscal`, `c_UsoCFDI`, `c_FormaPago`, `c_MetodoPago`, etc.).
- `dto/`: DTOs para configuración fiscal, emisión individual, emisión global y cancelación.
- `pac/`: Abstracción `IPacProvider` con implementaciones `MockSandboxPacAdapter` y `FacturamaPacAdapter`, orquestadas por `PacFactory`.
- `invoicing.service.ts`: Lógica de negocio fiscal, cálculo de bases e IVA, prevención de duplicados, generación de PDF (`pdfkit`) y XML.
- `invoicing.controller.ts`: Endpoints REST expuestos bajo `/api/invoicing/*`.
