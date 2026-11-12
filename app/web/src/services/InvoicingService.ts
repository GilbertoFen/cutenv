import { apiFetch } from '@/lib/api';
import { getApiUrl } from '@/lib/config';
import type {
  FiscalConfigData,
  FiscalCustomerData,
  InvoiceData,
  GlobalInvoicePreview,
  SatCatalogsData,
} from '@/types';

export async function getFiscalConfig(): Promise<FiscalConfigData> {
  const res = await apiFetch('/invoicing/config');
  if (!res.ok) throw new Error('Error al obtener la configuración fiscal');
  return res.json();
}

export async function saveFiscalConfig(data: Partial<FiscalConfigData>) {
  const res = await apiFetch('/invoicing/config', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.message || 'Error al guardar la configuración fiscal');
  }
  return res.json();
}

export async function validatePacCredentials() {
  const res = await apiFetch('/invoicing/config/validate', {
    method: 'POST',
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.message || 'Error al validar credenciales del PAC');
  }
  return res.json();
}

export async function issueIndividualInvoice(
  saleId: string,
  payload: {
    receptor: {
      rfc: string;
      legalName: string;
      postalCode: string;
      taxRegime: string;
      cfdiUse: string;
      email?: string;
    };
    paymentMethod?: string;
    saveCustomer?: boolean;
    sendEmail?: boolean;
  }
): Promise<InvoiceData> {
  const res = await apiFetch(`/invoicing/issue/sale/${saleId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.message || 'Error al timbrar el comprobante fiscal');
  }
  return res.json();
}

export async function previewGlobalInvoice(startDate: string, endDate: string): Promise<GlobalInvoicePreview> {
  const params = new URLSearchParams({ startDate, endDate });
  const res = await apiFetch(`/invoicing/global/preview?${params.toString()}`);
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.message || 'Error al previsualizar la factura global');
  }
  return res.json();
}

export async function issueGlobalInvoice(payload: {
  periodicity: '01' | '02' | '03' | '04';
  months: string;
  year: number;
  startDate: string;
  endDate: string;
  paymentMethod?: string;
}): Promise<InvoiceData> {
  const res = await apiFetch('/invoicing/issue/global', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.message || 'Error al timbrar la factura global');
  }
  return res.json();
}

export async function getInvoices(filters?: { type?: string; status?: string; search?: string }): Promise<InvoiceData[]> {
  const params = new URLSearchParams();
  if (filters?.type && filters.type !== 'all') params.append('type', filters.type);
  if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters?.search) params.append('search', filters.search);

  const res = await apiFetch(`/invoicing/invoices?${params.toString()}`);
  if (!res.ok) throw new Error('Error al obtener el historial de facturas');
  return res.json();
}

export async function getInvoiceById(id: string): Promise<InvoiceData> {
  const res = await apiFetch(`/invoicing/invoices/${id}`);
  if (!res.ok) throw new Error('Error al consultar la factura');
  return res.json();
}

export function getInvoiceXmlUrl(id: string): string {
  return getApiUrl(`/invoicing/invoices/${id}/xml`);
}

export function getInvoicePdfUrl(id: string): string {
  return getApiUrl(`/invoicing/invoices/${id}/pdf`);
}

export async function sendInvoiceEmail(id: string, email?: string): Promise<{ success: boolean; message: string }> {
  const res = await apiFetch(`/invoicing/invoices/${id}/send`, {
    method: 'POST',
    body: JSON.stringify({ email: email || undefined }),
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.message || 'Error al enviar la factura por correo');
  }
  return res.json();
}

export async function cancelInvoice(
  id: string,
  reason: '01' | '02' | '03' | '04',
  replacementUuid?: string
) {
  const res = await apiFetch(`/invoicing/invoices/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason, replacementUuid: replacementUuid || undefined }),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.message || 'No se pudo cancelar la factura');
  }
  return res.json();
}

export async function getFiscalCustomers(q?: string): Promise<FiscalCustomerData[]> {
  const params = q ? `?q=${encodeURIComponent(q)}` : '';
  const res = await apiFetch(`/invoicing/customers${params}`);
  if (!res.ok) throw new Error('Error al obtener clientes fiscales');
  return res.json();
}

export async function saveFiscalCustomer(customer: Partial<FiscalCustomerData>): Promise<FiscalCustomerData> {
  const res = await apiFetch('/invoicing/customers', {
    method: 'POST',
    body: JSON.stringify(customer),
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.message || 'Error al guardar el cliente fiscal');
  }
  return res.json();
}

export async function getSatCatalogs(): Promise<SatCatalogsData> {
  const res = await apiFetch('/invoicing/catalogs');
  if (!res.ok) throw new Error('Error al obtener los catálogos del SAT');
  return res.json();
}
