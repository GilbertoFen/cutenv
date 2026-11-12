'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppIcon } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import {
  getEmployees,
  getEmployeeStats,
  updateEmployee,
  requestEmployeePasswordReset,
  reinviteEmployee,
  getPasswordResetRequests,
  authorizeEmployeePasswordReset,
  rejectEmployeePasswordReset,
  type PasswordResetRequestItem,
} from '@/services/EmployeeService';
import type { EmployeeItem, EmployeeStats, OperationalRole } from '@/types';
import CreateEmployeeModal from './CreateEmployeeModal';
import EditEmployeeModal from './EditEmployeeModal';
import RestaurantScheduleModal from './RestaurantScheduleModal';
import AuditLogModal from './AuditLogModal';

export default function EmployeesPanel() {
  const { adminUser } = useAuth();
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [resetRequests, setResetRequests] = useState<PasswordResetRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeItem | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);

  // Password reset result modal
  const [resetModalData, setResetModalData] = useState<{
    userName: string;
    resetUrl: string;
  } | null>(null);
  const [copiedReset, setCopiedReset] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [presenceFilter, setPresenceFilter] = useState<string>('all');

  const restaurantId = adminUser?.restaurantId || 'default-restaurant';
  const currentUserRole = (adminUser?.role as 'owner' | 'manager' | 'root-admin') || 'manager';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [empList, statsData, pendingResets] = await Promise.all([
        getEmployees(),
        getEmployeeStats(),
        getPasswordResetRequests().catch(() => []),
      ]);
      setEmployees(empList);
      setStats(statsData);
      setResetRequests(pendingResets);
    } catch (err: any) {
      console.error('Error fetching employees:', err);
      setError(err.message || 'No se pudieron cargar los empleados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refrescar cada 30 segundos para presencia en vivo
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Handlers
  const handleToggleStatus = async (employee: EmployeeItem) => {
    const newStatus = employee.status === 'active' ? 'inactive' : 'active';
    const actionText = newStatus === 'active' ? 'reactivar' : 'desactivar';
    if (!confirm(`¿Está seguro de ${actionText} la cuenta de ${employee.name}?`)) {
      return;
    }

    try {
      const res = await updateEmployee(employee.id, { status: newStatus });
      setEmployees((prev) => prev.map((e) => (e.id === res.employee.id ? res.employee : e)));
      // Refrescar stats
      getEmployeeStats().then(setStats);
    } catch (err: any) {
      alert(`Error al actualizar estado: ${err.message}`);
    }
  };

  const handleAuthorizeReset = async (requestId: string, employeeName: string) => {
    try {
      const res = await authorizeEmployeePasswordReset(requestId);
      const host = typeof window !== 'undefined' ? window.location.origin : '';
      const resetUrl = `${host}/set-password?token=${res.resetToken}&mode=reset`;
      setResetModalData({
        userName: employeeName,
        resetUrl,
      });
      fetchData();
    } catch (err: any) {
      alert(`Error al autorizar solicitud: ${err.message}`);
    }
  };

  const handleRejectReset = async (requestId: string, employeeName: string) => {
    if (!confirm(`¿Está seguro de rechazar la solicitud de restablecimiento para ${employeeName}? No se generará ningún enlace.`)) {
      return;
    }
    try {
      await rejectEmployeePasswordReset(requestId);
      fetchData();
    } catch (err: any) {
      alert(`Error al rechazar solicitud: ${err.message}`);
    }
  };

  const handleRequestPasswordReset = async (employee: EmployeeItem) => {
    try {
      const res = await requestEmployeePasswordReset(employee.id);
      const host = typeof window !== 'undefined' ? window.location.origin : '';
      const resetUrl = `${host}/set-password?token=${res.resetToken}&mode=reset`;
      setResetModalData({
        userName: `${employee.name} ${employee.lastName || ''} (@${employee.username})`,
        resetUrl,
      });
      fetchData();
    } catch (err: any) {
      alert(`Error al generar enlace de restablecimiento: ${err.message}`);
    }
  };

  const handleReinvite = async (employee: EmployeeItem) => {
    try {
      const res = await reinviteEmployee(employee.id);
      const host = typeof window !== 'undefined' ? window.location.origin : '';
      const inviteUrl = `${host}/set-password?token=${res.invitationToken}`;
      setResetModalData({
        userName: `${employee.name} ${employee.lastName || ''} (@${employee.username})`,
        resetUrl: inviteUrl,
      });
    } catch (err: any) {
      alert(`Error al reenviar invitación: ${err.message}`);
    }
  };

  const handleCopyResetUrl = () => {
    if (resetModalData?.resetUrl) {
      navigator.clipboard.writeText(resetModalData.resetUrl);
      setCopiedReset(true);
      setTimeout(() => setCopiedReset(false), 2000);
    }
  };

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = `${emp.name} ${emp.lastName || ''}`.toLowerCase().includes(term);
        const matchUser = emp.username.toLowerCase().includes(term);
        const matchEmail = (emp.email || '').toLowerCase().includes(term);
        if (!matchName && !matchUser && !matchEmail) return false;
      }

      // Role filter
      if (roleFilter !== 'all') {
        if (roleFilter === 'manager' && emp.role !== 'manager') return false;
        if (roleFilter === 'owner' && emp.role !== 'owner') return false;
        if (roleFilter.startsWith('op_') && emp.operationalRole !== roleFilter.replace('op_', '')) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all' && emp.status !== statusFilter) {
        return false;
      }

      // Presence filter
      if (presenceFilter !== 'all') {
        const isOnline = emp.isOnline;
        const isRestricted = emp.scheduleRestricted;
        if (presenceFilter === 'online' && !isOnline) return false;
        if (presenceFilter === 'offline' && isOnline) return false;
        if (presenceFilter === 'restricted' && !isRestricted) return false;
      }

      return true;
    });
  }, [employees, searchTerm, roleFilter, statusFilter, presenceFilter]);

  const getRoleBadge = (emp: EmployeeItem) => {
    if (emp.role === 'owner') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-100 text-purple-800 border border-purple-200">
          Dueño
        </span>
      );
    }
    if (emp.role === 'manager') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
          Gerente
        </span>
      );
    }

    const opMap: Record<string, { label: string; color: string }> = {
      mesero: { label: 'Mesero', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      cocinero: { label: 'Cocinero', color: 'bg-amber-50 text-amber-800 border-amber-200' },
      cajero: { label: 'Cajero', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
      recepcionista: { label: 'Recepcionista', color: 'bg-pink-50 text-pink-700 border-pink-200' },
      general: { label: 'Operativo', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    };

    const op = opMap[emp.operationalRole || 'general'] || opMap.general;
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${op.color}`}>
        {op.label}
      </span>
    );
  };

  const getPresenceBadge = (emp: EmployeeItem) => {
    if (emp.status === 'inactive') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Cuenta Inactiva
        </span>
      );
    }

    if (emp.isOnline) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          En línea
        </span>
      );
    }

    if (emp.scheduleRestricted) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Fuera de horario
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        Desconectado
      </span>
    );
  };

  const formatLastActivity = (dateStr?: string) => {
    if (!dateStr) return 'Nunca';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;
    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  };

  return (
    <section className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-soft-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Gestión de Empleados y Control de Turnos
            </h2>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              POS Restringido por Horarios
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Administre al personal operativo, supervise la presencia en tiempo real y configure la disponibilidad horaria del POS.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsScheduleOpen(true)}
            className="px-3.5 py-2.5 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700 font-bold text-xs transition-all flex items-center gap-2 shadow-sm"
          >
            <AppIcon name="clock" size={15} className="text-indigo-600" />
            <span>Disponibilidad del POS</span>
          </button>

          <button
            onClick={() => setIsAuditOpen(true)}
            className="px-3.5 py-2.5 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700 font-bold text-xs transition-all flex items-center gap-2 shadow-sm"
          >
            <AppIcon name="history" size={15} className="text-indigo-600" />
            <span>Auditoría</span>
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2"
          >
            <AppIcon name="add" size={15} />
            <span>+ Nuevo Empleado</span>
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft-sm">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats?.total ?? '—'}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Empleados dados de alta</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft-sm">
          <div className="text-[11px] font-black uppercase tracking-wider text-emerald-600">En Línea</div>
          <div className="text-2xl font-black text-emerald-700 mt-1 flex items-center gap-2">
            <span>{stats?.online ?? '—'}</span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <div className="text-[11px] text-emerald-600/80 mt-0.5">Conectados en el POS</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft-sm">
          <div className="text-[11px] font-black uppercase tracking-wider text-amber-600">Fuera de Horario</div>
          <div className="text-2xl font-black text-amber-700 mt-1">{stats?.restricted ?? '—'}</div>
          <div className="text-[11px] text-amber-600/80 mt-0.5">Acceso no disponible</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft-sm">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">Desconectados</div>
          <div className="text-2xl font-black text-slate-700 mt-1">{stats?.offline ?? '—'}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">En horario sin sesión</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft-sm col-span-2 sm:col-span-1">
          <div className="text-[11px] font-black uppercase tracking-wider text-indigo-600">Activos</div>
          <div className="text-2xl font-black text-indigo-900 mt-1">{stats?.active ?? '—'}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Cuentas habilitadas</div>
        </div>
      </div>

      {/* Solicitudes de Restablecimiento de Contraseña Pendientes */}
      {resetRequests.length > 0 && (
        <div className="bg-amber-50/90 border-2 border-amber-300 rounded-3xl p-5 shadow-soft-sm animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-200 text-amber-800 shrink-0">
              <AppIcon name="lock" size={20} />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-extrabold text-amber-950">
                  Solicitudes de Restablecimiento de Contraseña ({resetRequests.length})
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 animate-pulse">
                  Requiere Autorización Explícita
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Los siguientes empleados han solicitado restablecer su contraseña. Por seguridad del sistema, revise y autorice explícitamente para emitir un enlace temporal y de un solo uso. Si la rechaza, la petición se cancelará sin emitir ningún enlace.
              </p>

              <div className="mt-4 space-y-2.5">
                {resetRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-amber-200 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900">
                          {req.name} {req.lastName}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">(@{req.username})</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                          {req.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                        <span>Motivo: {req.reason || 'Restablecimiento de credenciales'}</span>
                        {req.requestedAt && (
                          <span>• Solicitado: {new Date(req.requestedAt).toLocaleString('es-MX')}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleAuthorizeReset(req.id, `${req.name} (@${req.username})`)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-all shadow-sm flex items-center gap-1.5"
                      >
                        <AppIcon name="check" size={13} />
                        <span>Autorizar y Emitir Enlace</span>
                      </button>
                      <button
                        onClick={() => handleRejectReset(req.id, `${req.name} (@${req.username})`)}
                        className="px-3.5 py-2 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-all flex items-center gap-1.5"
                      >
                        <AppIcon name="close" size={13} />
                        <span>Rechazar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, usuario o email..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <div className="absolute left-3 top-2.5 text-slate-400">
            <AppIcon name="search" size={14} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
          >
            <option value="all">Todos los roles</option>
            <option value="owner">Dueño</option>
            <option value="manager">Gerente</option>
            <option value="op_mesero">Meseros</option>
            <option value="op_cocinero">Cocineros</option>
            <option value="op_cajero">Cajeros</option>
            <option value="op_recepcionista">Recepcionistas</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos / Suspendidos</option>
          </select>

          {/* Presence Filter */}
          <select
            value={presenceFilter}
            onChange={(e) => setPresenceFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
          >
            <option value="all">Toda presencia</option>
            <option value="online">En línea</option>
            <option value="offline">Desconectados</option>
            <option value="restricted">Fuera de horario</option>
          </select>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-600 transition-all shrink-0"
            title="Recargar lista"
          >
            <AppIcon name="refresh" size={14} />
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-soft-sm overflow-hidden">
        {error && (
          <div className="p-4 bg-rose-50 border-b border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
            <AppIcon name="error" size={16} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && employees.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Cargando empleados del restaurante...
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mb-2">
              <AppIcon name="users" size={24} />
            </div>
            <div className="font-bold text-slate-700">No se encontraron empleados</div>
            <p className="text-xs text-slate-400 mt-1">
              Pruebe cambiando los filtros de búsqueda o registre un nuevo empleado.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Empleado</th>
                  <th className="py-3 px-4">Puesto / Rol</th>
                  <th className="py-3 px-4">Disponibilidad de Acceso</th>
                  <th className="py-3 px-4">Presencia / Conexión</th>
                  <th className="py-3 px-4">Última Actividad</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => {
                  const isManagerOrOwner = emp.role === 'owner' || emp.role === 'manager';
                  const hasCustomSchedule = emp.individualSchedule?.enabled;

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-all">
                      {/* Name & Username */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-xs shrink-0">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">
                              {emp.name} {emp.lastName || ''}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              @{emp.username}
                              {emp.email && <span className="ml-2 font-sans">· {emp.email}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4 whitespace-nowrap">{getRoleBadge(emp)}</td>

                      {/* Schedule Availability */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isManagerOrOwner ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                            <AppIcon name="security" size={12} className="text-indigo-600" />
                            Acceso 24/7 (Sin restricción)
                          </span>
                        ) : hasCustomSchedule ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 cursor-help"
                            title="Horario personalizado configurado para este empleado"
                          >
                            <AppIcon name="clock" size={12} className="text-purple-600" />
                            Turnos Personalizados
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            <AppIcon name="clock" size={12} className="text-slate-400" />
                            Horario del Restaurante
                          </span>
                        )}
                      </td>

                      {/* Presence */}
                      <td className="py-3 px-4 whitespace-nowrap">{getPresenceBadge(emp)}</td>

                      {/* Last Activity */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-medium">
                        {formatLastActivity(emp.lastActivity)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingEmployee(emp)}
                            className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700 font-bold text-[11px] transition-all"
                            title="Editar datos y horarios"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => handleRequestPasswordReset(emp)}
                            className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 text-slate-700 font-bold text-[11px] transition-all"
                            title="Restablecer contraseña mediante enlace seguro"
                          >
                            Restablecer
                          </button>

                          {!emp.invitationUsed && emp.invitationToken && (
                            <button
                              onClick={() => handleReinvite(emp)}
                              className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-blue-700 font-bold text-[11px] transition-all"
                              title="Reenviar invitación de acceso"
                            >
                              Invitación
                            </button>
                          )}

                          {emp.role !== 'owner' && (
                            <button
                              onClick={() => handleToggleStatus(emp)}
                              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
                                emp.status === 'active'
                                  ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {emp.status === 'active' ? 'Desactivar' : 'Activar'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sub-modals */}
      <CreateEmployeeModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          fetchData();
        }}
        currentUserRole={currentUserRole}
      />

      <EditEmployeeModal
        isOpen={!!editingEmployee}
        employee={editingEmployee}
        onClose={() => setEditingEmployee(null)}
        onUpdated={() => {
          setEditingEmployee(null);
          fetchData();
        }}
        currentUserRole={currentUserRole}
      />

      <RestaurantScheduleModal
        isOpen={isScheduleOpen}
        restaurantId={restaurantId}
        onClose={() => setIsScheduleOpen(false)}
        onSaved={() => {
          fetchData();
        }}
      />

      <AuditLogModal
        isOpen={isAuditOpen}
        restaurantId={restaurantId}
        onClose={() => setIsAuditOpen(false)}
      />

      {/* Password Reset / Invitation Link Copy Modal */}
      {resetModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <AppIcon name="security" size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Enlace de Restablecimiento Seguro
                  </h3>
                  <p className="text-xs text-slate-500">
                    Para {resetModalData.userName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setResetModalData(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all"
              >
                <AppIcon name="close" size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Comparta este enlace de un solo uso con el empleado. Este enlace le permitirá establecer una nueva contraseña de forma segura y expirará en 24 horas. Al confirmarse, se revocarán automáticamente todas sus sesiones activas previas:
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={resetModalData.resetUrl}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono text-slate-800 bg-slate-50 select-all"
              />
              <button
                type="button"
                onClick={handleCopyResetUrl}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shrink-0 transition-all shadow-sm flex items-center gap-1.5"
              >
                <AppIcon name={copiedReset ? 'check' : 'copy'} size={14} />
                <span>{copiedReset ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setResetModalData(null)}
                className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
