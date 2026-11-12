import { apiFetch } from '@/lib/api';
import type { EmployeeItem, DaySchedule, AuditLogItem } from '@/types';

export interface CreateEmployeePayload {
  name: string;
  lastName?: string;
  email: string;
  username?: string;
  role?: 'worker' | 'manager';
  operationalRole?: 'mesero' | 'cocinero' | 'cajero' | 'recepcionista' | 'general';
  status?: 'active' | 'inactive';
  individualSchedule?: {
    enabled: boolean;
    weeklySchedule: DaySchedule[];
  };
}

export interface UpdateEmployeePayload {
  name?: string;
  lastName?: string;
  email?: string;
  role?: 'worker' | 'manager';
  operationalRole?: 'mesero' | 'cocinero' | 'cajero' | 'recepcionista' | 'general';
  status?: 'active' | 'inactive';
  individualSchedule?: {
    enabled: boolean;
    weeklySchedule: DaySchedule[];
  };
}

export interface EmployeeStats {
  total: number;
  active: number;
  online: number;
  offline: number;
  restricted: number;
}

export async function getEmployees(params?: {
  role?: string;
  operationalRole?: string;
  status?: string;
  search?: string;
  connectionStatus?: string;
}): Promise<EmployeeItem[]> {
  const query = new URLSearchParams();
  if (params?.role && params.role !== 'all') query.set('role', params.role);
  if (params?.operationalRole && params.operationalRole !== 'all') query.set('operationalRole', params.operationalRole);
  if (params?.status && params.status !== 'all') query.set('status', params.status);
  if (params?.connectionStatus && params.connectionStatus !== 'all') query.set('connectionStatus', params.connectionStatus);
  if (params?.search) query.set('search', params.search);

  const qs = query.toString();
  const res = await apiFetch(`/employees${qs ? `?${qs}` : ''}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al obtener la lista de personal');
  }
  return res.json();
}

export async function getEmployeeStats(): Promise<EmployeeStats> {
  const res = await apiFetch('/employees/stats');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al obtener estadísticas del personal');
  }
  return res.json();
}

export async function createEmployee(payload: CreateEmployeePayload): Promise<{
  success: boolean;
  employee: EmployeeItem;
  invitationToken: string;
  invitationUrl: string;
}> {
  const res = await apiFetch('/employees', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al registrar nuevo empleado');
  }
  return res.json();
}

export async function updateEmployee(
  id: string,
  payload: UpdateEmployeePayload,
): Promise<{ success: boolean; employee: EmployeeItem }> {
  const res = await apiFetch(`/employees/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al actualizar información del empleado');
  }
  return res.json();
}

export interface PasswordResetRequestItem {
  id: string;
  name: string;
  lastName?: string;
  username: string;
  email?: string;
  role: string;
  operationalRole?: string;
  requestedAt?: string;
  reason?: string;
}

export async function getPasswordResetRequests(): Promise<PasswordResetRequestItem[]> {
  const res = await apiFetch('/employees/password-reset-requests');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al obtener solicitudes de restablecimiento');
  }
  return res.json();
}

export async function authorizeEmployeePasswordReset(id: string): Promise<{
  success: boolean;
  message: string;
  resetToken: string;
  resetUrl: string;
}> {
  const res = await apiFetch(`/employees/password-reset-requests/${encodeURIComponent(id)}/authorize`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al autorizar restablecimiento de contraseña');
  }
  return res.json();
}

export async function rejectEmployeePasswordReset(id: string): Promise<{
  success: boolean;
  message: string;
}> {
  const res = await apiFetch(`/employees/password-reset-requests/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al rechazar restablecimiento de contraseña');
  }
  return res.json();
}

export async function requestEmployeePasswordReset(id: string): Promise<{
  success: boolean;
  message: string;
  resetToken: string;
  resetUrl: string;
}> {
  const res = await apiFetch(`/employees/${encodeURIComponent(id)}/reset-password`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al solicitar restablecimiento de contraseña');
  }
  return res.json();
}

export async function reinviteEmployee(id: string): Promise<{
  success: boolean;
  message: string;
  invitationToken: string;
  invitationUrl: string;
}> {
  const res = await apiFetch(`/employees/${encodeURIComponent(id)}/reinvite`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al regenerar invitación');
  }
  return res.json();
}

export async function getAuditLogs(params?: {
  action?: string;
  targetType?: string;
  limit?: number;
  skip?: number;
}): Promise<{ total: number; logs: AuditLogItem[] }> {
  const query = new URLSearchParams();
  if (params?.action) query.set('action', params.action);
  if (params?.targetType) query.set('targetType', params.targetType);
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.skip) query.set('skip', String(params.skip));

  const qs = query.toString();
  const res = await apiFetch(`/audit-logs${qs ? `?${qs}` : ''}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al consultar historial de auditoría');
  }
  return res.json();
}

