'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  rootLogin,
  getRootUsers,
  createRootUser,
  toggleRootUserStatus,
  deleteRootUser,
  getStoredRootKey,
  clearRootSession,
} from '@/services/AuthService';
import {
  getPrinterAgentUrl,
  setPrinterAgentUrl,
  checkPrinterAgentStatus,
  type PrinterStatus,
} from '@/services/PrinterService';
import {
  getAllRestaurants,
  createRestaurant,
  updateRestaurant,
  type CreatedRestaurantResponse,
} from '@/services/RestaurantService';
import { getAuditLogs } from '@/services/EmployeeService';
import type { User, Restaurant, AuditLogItem } from '@/types';
import { AppIcon } from '@/components/icons';
import { useNotification } from '@/context/NotificationContext';
import Modal from '@/components/UI/Modal';

export default function RootAdminPage() {
  const { confirm, notify } = useNotification();
  const [rootKey, setRootKey] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Tabs: 'restaurants' | 'users' | 'audit'
  const [activeTab, setActiveTab] = useState<'restaurants' | 'users' | 'network' | 'audit'>('restaurants');

  // Restaurants state
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  const [restaurantFilter, setRestaurantFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [restaurantSearch, setRestaurantSearch] = useState('');

  // Modal crear restaurante
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingRest, setCreatingRest] = useState(false);
  const [restForm, setRestForm] = useState({
    name: '',
    code: '',
    timezone: 'America/Mexico_City',
    address: '',
    phone: '',
    ownerName: '',
    ownerEmail: '',
    managerName: '',
    managerEmail: '',
  });

  // Modal éxito creación restaurante (muestra enlaces de invitación)
  const [createdResult, setCreatedResult] = useState<CreatedRestaurantResponse | null>(null);

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Modal crear usuario
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [userForm, setUserForm] = useState({
    name: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    role: 'manager' as 'owner' | 'manager' | 'worker',
    restaurantId: '',
  });

  // Printer network config state
  const [agentUrlInput, setAgentUrlInput] = useState('');
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus | null>(null);
  const [checkingPrinter, setCheckingPrinter] = useState(false);

  // Audit state
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    const saved = getStoredRootKey();
    if (saved) {
      setRootKey(saved);
      setAgentUrlInput(getPrinterAgentUrl());
      loadAllData();
    }
  }, []);

  const loadAllData = async () => {
    loadRestaurants();
    loadUsers();
    loadAudit();
  };

  const loadRestaurants = async () => {
    setLoadingRestaurants(true);
    try {
      const data = await getAllRestaurants();
      setRestaurants(data);
    } catch (err: any) {
      console.warn('Error loading restaurants:', err);
    } finally {
      setLoadingRestaurants(false);
    }
  };

  const loadUsers = async () => {
    const key = getStoredRootKey() || rootKey;
    if (!key) return;
    setLoadingUsers(true);
    try {
      const data = await getRootUsers(key);
      setUsers(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadAudit = async () => {
    setLoadingAudit(true);
    try {
      const data = await getAuditLogs({ limit: 50 });
      setAuditLogs(data.logs || []);
    } catch (err: any) {
      console.warn('Error loading audit logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleRootAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await rootLogin(passwordInput);
      setRootKey(passwordInput);
      setPasswordInput('');
      await loadAllData();
    } catch (err: any) {
      setError(err.message || 'Contraseña de root incorrecta');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name.trim() || !userForm.username.trim() || !userForm.password.trim()) {
      notify.error('Nombre, usuario y contraseña inicial son obligatorios.');
      return;
    }
    const key = getStoredRootKey() || rootKey;
    if (!key) return;

    setCreatingUser(true);
    try {
      await createRootUser(key, {
        name: userForm.name.trim(),
        lastName: userForm.lastName.trim() || undefined,
        username: userForm.username.trim(),
        email: userForm.email.trim() || undefined,
        password: userForm.password,
        role: userForm.role,
        restaurantId: userForm.restaurantId || undefined,
      });
      notify.success(`Usuario "${userForm.username}" registrado exitosamente.`);
      setShowCreateUserModal(false);
      setUserForm({
        name: '',
        lastName: '',
        username: '',
        email: '',
        password: '',
        role: 'manager',
        restaurantId: '',
      });
      loadUsers();
      loadAudit();
    } catch (err: any) {
      notify.error(err.message || 'Error al dar de alta el usuario.');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    if (user.username === 'root') {
      notify.warning('La cuenta root no puede ser desactivada.');
      return;
    }
    const key = getStoredRootKey() || rootKey;
    if (!key) return;

    const isActivating = user.status === 'inactive';
    const ok = await confirm({
      title: `${isActivating ? 'Activar' : 'Desactivar'} Usuario`,
      message: `¿Estás seguro de que deseas ${isActivating ? 'activar' : 'desactivar'} la cuenta de "${user.name}" (${user.username})?`,
      confirmText: isActivating ? 'Sí, activar' : 'Sí, desactivar',
      cancelText: 'Cancelar',
      type: isActivating ? 'primary' : 'danger',
    });
    if (!ok) return;

    try {
      await toggleRootUserStatus(key, user.id);
      notify.success(`Cuenta de ${user.username} ${isActivating ? 'activada' : 'desactivada'}.`);
      loadUsers();
      loadAudit();
    } catch (err: any) {
      notify.error(err.message || 'Error al cambiar estado del usuario.');
    }
  };

  const handleTestPrinter = async (targetUrl?: string) => {
    setCheckingPrinter(true);
    try {
      if (targetUrl) {
        setPrinterAgentUrl(targetUrl);
      }
      const st = await checkPrinterAgentStatus();
      setPrinterStatus(st);
      if (st.online) {
        notify.success(`Impresora conectada: ${st.printerName || 'Dispositivo listo'}`);
      } else {
        notify.warning('Agente de impresión no responde en esa URL / puerto.');
      }
    } catch (e: any) {
      notify.error(e?.message || 'Error al verificar impresora.');
    } finally {
      setCheckingPrinter(false);
    }
  };

  const handleSavePrinterUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentUrlInput.trim()) return;
    setPrinterAgentUrl(agentUrlInput.trim());
    notify.success('URL del agente de impresión actualizada.');
    handleTestPrinter(agentUrlInput.trim());
  };

  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (
      !restForm.name.trim() ||
      !restForm.ownerName.trim() ||
      !restForm.ownerEmail.trim() ||
      !restForm.managerName.trim() ||
      !restForm.managerEmail.trim()
    ) {
      notify.error('Todos los campos requeridos deben completarse.');
      return;
    }

    setCreatingRest(true);
    try {
      const res = await createRestaurant(restForm);
      setShowCreateModal(false);
      setCreatedResult(res);
      notify.success(`Restaurante "${res.restaurant.name}" registrado exitosamente.`);
      setRestForm({
        name: '',
        code: '',
        timezone: 'America/Mexico_City',
        address: '',
        phone: '',
        ownerName: '',
        ownerEmail: '',
        managerName: '',
        managerEmail: '',
      });
      loadRestaurants();
      loadUsers();
      loadAudit();
    } catch (err: any) {
      notify.error(err.message || 'Error al registrar el restaurante.');
    } finally {
      setCreatingRest(false);
    }
  };

  const handleToggleRestaurantStatus = async (restaurant: Restaurant) => {
    const isActivating = restaurant.status === 'inactive';
    const actionText = isActivating ? 'activar' : 'suspender';

    const ok = await confirm({
      title: `${isActivating ? 'Activar' : 'Suspender'} Restaurante`,
      message: `¿Estás seguro de que deseas ${actionText} el restaurante "${restaurant.name}"? ${
        !isActivating
          ? 'Todas las sesiones activas de sus administradores y empleados serán revocadas inmediatamente.'
          : 'Sus administradores podrán ingresar nuevamente.'
      }`,
      confirmText: isActivating ? 'Sí, activar' : 'Sí, suspender',
      cancelText: 'Cancelar',
      type: isActivating ? 'primary' : 'danger',
    });

    if (!ok) return;

    try {
      await updateRestaurant(restaurant.id, {
        status: isActivating ? 'active' : 'inactive',
      });
      notify.success(`Restaurante ${restaurant.name} ${isActivating ? 'activado' : 'suspendido'}.`);
      loadRestaurants();
      loadAudit();
    } catch (err: any) {
      notify.error(err.message || 'Error al actualizar estado del restaurante');
    }
  };

  const handleCopyLink = (url: string) => {
    const fullUrl = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl);
    notify.success('Enlace de invitación copiado al portapapeles.');
  };

  const filteredRestaurants = restaurants.filter((r) => {
    if (restaurantFilter !== 'all' && r.status !== restaurantFilter) return false;
    if (restaurantSearch.trim()) {
      const s = restaurantSearch.toLowerCase().trim();
      return (
        r.name?.toLowerCase().includes(s) ||
        r.code?.toLowerCase().includes(s) ||
        r.owner?.name?.toLowerCase().includes(s) ||
        r.owner?.email?.toLowerCase().includes(s) ||
        r.manager?.name?.toLowerCase().includes(s) ||
        r.manager?.email?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  // Login Gate para Root Admin
  if (!rootKey) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 text-white p-8 rounded-3xl shadow-soft-xl max-w-md w-full border border-slate-700">
          <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 mx-auto mb-4">
            <AppIcon name="security" size={28} />
          </div>
          <h1 className="text-xl font-black text-center mb-1">Root Admin Platform</h1>
          <p className="text-xs text-slate-400 text-center mb-6">
            Administración central de restaurantes, credenciales maestras y auditoría global
          </p>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleRootAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Contraseña Maestra de Plataforma
              </label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Ingresa la clave root…"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition active:scale-95 shadow-soft-xs"
            >
              {loading ? 'Validando…' : 'Acceder al Panel Root'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-700 text-center">
            <Link href="/login" className="text-xs text-indigo-400 hover:underline">
              ← Volver al login del restaurante
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <header className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-soft-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
              Plataforma Multi-Restaurante POS
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Panel de Administración Root
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestión jerárquica de restaurantes, cuentas de Dueños y Gerentes, horarios y auditoría
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-1.5 shadow-soft-xs active:scale-95"
          >
            <AppIcon name="add" size={14} />
            <span>Nuevo Restaurante</span>
          </button>

          <button
            onClick={() => {
              clearRootSession();
              setRootKey(null);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            Cerrar Sesión Root
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('restaurants')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'restaurants'
              ? 'bg-slate-900 text-white shadow-soft-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <AppIcon name="building" size={14} />
          <span>Restaurantes Registrados</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-200">
            {restaurants.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'users'
              ? 'bg-slate-900 text-white shadow-soft-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <AppIcon name="users" size={14} />
          <span>Cuentas de Plataforma</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-200">
            {users.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('network');
            setAgentUrlInput(getPrinterAgentUrl());
            handleTestPrinter();
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'network'
              ? 'bg-slate-900 text-white shadow-soft-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <AppIcon name="settings" size={14} />
          <span>Red e Impresión</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'bg-slate-900 text-white shadow-soft-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <AppIcon name="reports" size={14} />
          <span>Auditoría y Eventos</span>
        </button>
      </div>

      {/* Tab 1: Restaurantes */}
      {activeTab === 'restaurants' && (
        <section className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <input
                type="text"
                placeholder="Buscar por nombre, código, correo de dueño o gerente…"
                value={restaurantSearch}
                onChange={(e) => setRestaurantSearch(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 px-3 py-1.5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Estado:</span>
              <select
                value={restaurantFilter}
                onChange={(e) => setRestaurantFilter(e.target.value as any)}
                className="text-xs rounded-xl border border-slate-300 px-3 py-1.5 bg-white font-medium"
              >
                <option value="all">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="inactive">Suspendidos</option>
              </select>

              <button
                onClick={loadRestaurants}
                className="text-xs px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 font-bold text-slate-700"
              >
                ↻ Recargar
              </button>
            </div>
          </div>

          {/* Grid de Restaurantes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingRestaurants ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                Cargando restaurantes…
              </div>
            ) : filteredRestaurants.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-white rounded-3xl border border-dashed border-slate-200 p-8">
                No se encontraron restaurantes que coincidan con la búsqueda.
              </div>
            ) : (
              filteredRestaurants.map((r) => {
                const isActive = r.status === 'active';
                return (
                  <div
                    key={r.id}
                    className="bg-white rounded-3xl p-5 border border-slate-200 shadow-soft-xs hover:shadow-soft-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            {r.code}
                          </span>
                          <h3 className="font-black text-base text-slate-900 leading-tight">
                            {r.name}
                          </h3>
                        </div>
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {isActive ? 'Activo' : 'Suspendido'}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 my-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Zona horaria:</span>
                          <span className="font-mono text-[11px] font-bold text-slate-700">
                            {r.timezone}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Personal registrado:</span>
                          <span className="font-bold text-slate-800">
                            {r.userCount || 0} usuarios ({r.workerCount || 0} operativos)
                          </span>
                        </div>
                      </div>

                      {/* Administradores asociados */}
                      <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Dueño
                          </span>
                          <p className="font-bold text-slate-800 truncate">
                            {r.owner?.name || '—'}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono truncate">
                            {r.owner?.email || '—'}
                          </p>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Gerente
                          </span>
                          <p className="font-bold text-slate-800 truncate">
                            {r.manager?.name || '—'}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono truncate">
                            {r.manager?.email || '—'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleToggleRestaurantStatus(r)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition active:scale-95 ${
                          isActive
                            ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                            : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {isActive ? 'Suspender' : 'Reactivar'}
                      </button>

                      <Link
                        href={`/manager`}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        <span>Abrir POS →</span>
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}

      {/* Tab 2: Usuarios */}
      {activeTab === 'users' && (
        <section className="bg-white rounded-3xl p-5 border border-slate-200 shadow-soft-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Cuentas Registradas en la Plataforma</h2>
              <p className="text-xs text-slate-500">Gestión de usuarios y niveles de acceso administrativo</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateUserModal(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-1.5 shadow-soft-xs active:scale-95"
              >
                <AppIcon name="add" size={14} />
                <span>Alta de Usuario</span>
              </button>
              <button
                onClick={loadUsers}
                className="text-xs px-3 py-1.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
              >
                ↻ Recargar
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-bold">Nombre</th>
                  <th className="py-2.5 px-3 font-bold">Usuario / Correo</th>
                  <th className="py-2.5 px-3 font-bold">Rol</th>
                  <th className="py-2.5 px-3 font-bold">Restaurante</th>
                  <th className="py-2.5 px-3 font-bold">Estado</th>
                  <th className="py-2.5 px-3 font-bold">Última Actividad</th>
                  <th className="py-2.5 px-3 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-bold text-slate-800">
                      {u.name} {u.lastName || ''}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{u.email || u.username}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          u.role === 'owner'
                            ? 'bg-purple-100 text-purple-800'
                            : u.role === 'manager'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {u.role === 'owner' ? 'Dueño' : u.role === 'manager' ? 'Gerente' : 'Trabajador'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {u.restaurant?.name || (u.username === 'root' ? 'Plataforma Global' : '—')}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          u.status === 'active'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {u.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {u.lastActivity ? new Date(u.lastActivity).toLocaleString('es-MX') : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {u.username === 'root' ? (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Protegido</span>
                      ) : (
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border transition active:scale-95 ${
                            u.status === 'active'
                              ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {u.status === 'active' ? 'Desactivar' : 'Activar'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tab: Red e Impresión */}
      {activeTab === 'network' && (
        <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-soft-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-black text-slate-900">Configuración Central de Red e Impresión</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Parámetros protegidos del microservicio printer-agent e integración de impresoras térmicas USB
              </p>
            </div>
            <button
              onClick={() => handleTestPrinter()}
              disabled={checkingPrinter}
              className="text-xs px-3.5 py-1.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {checkingPrinter ? 'Probando...' : '↻ Probar Conectividad'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <form onSubmit={handleSavePrinterUrl} className="space-y-4 bg-slate-50/70 p-5 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  URL / IP del Agente de Impresión Local
                </label>
                <input
                  type="text"
                  required
                  value={agentUrlInput}
                  onChange={(e) => setAgentUrlInput(e.target.value)}
                  placeholder="http://127.0.0.1:5001"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Dirección local o IP estática del equipo principal con la impresora USB conectada (puerto 5001 por defecto).
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition active:scale-95 shadow-soft-xs"
                >
                  Guardar Configuración
                </button>
                <button
                  type="button"
                  onClick={() => handleTestPrinter(agentUrlInput)}
                  disabled={checkingPrinter}
                  className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 active:scale-95"
                >
                  Probar Esta URL
                </button>
              </div>
            </form>

            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Estado de Conectividad</h3>
              {printerStatus ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2.5 rounded-xl bg-white border border-slate-200">
                    <span className="font-semibold text-slate-600">Servicio Agente:</span>
                    <span className={`font-black px-2 py-0.5 rounded-full text-[10px] ${printerStatus.online ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {printerStatus.online ? 'En Línea (Conectado)' : 'Fuera de Línea'}
                    </span>
                  </div>
                  {printerStatus.printerName && (
                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-white border border-slate-200">
                      <span className="font-semibold text-slate-600">Impresora Detectada:</span>
                      <span className="font-bold text-slate-800">{printerStatus.printerName}</span>
                    </div>
                  )}
                  {printerStatus.driver && (
                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-white border border-slate-200">
                      <span className="font-semibold text-slate-600">Controlador / Modo:</span>
                      <span className="font-mono text-slate-700">{printerStatus.driver}</span>
                    </div>
                  )}
                  {printerStatus.error && (
                    <p className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
                      {printerStatus.error}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-3">Presione &ldquo;Probar Conectividad&rdquo; para verificar el estado de la impresora.</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Tab 3: Auditoría */}
      {activeTab === 'audit' && (
        <section className="bg-white rounded-3xl p-5 border border-slate-200 shadow-soft-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Historial de Eventos de Auditoría</h2>
            <button
              onClick={loadAudit}
              className="text-xs px-3 py-1 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
            >
              ↻ Recargar
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-bold">Fecha / Hora</th>
                  <th className="py-2.5 px-3 font-bold">Usuario</th>
                  <th className="py-2.5 px-3 font-bold">Acción</th>
                  <th className="py-2.5 px-3 font-bold">Objetivo</th>
                  <th className="py-2.5 px-3 font-bold">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Sin registros de auditoría.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleString('es-MX')}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{log.userName}</td>
                      <td className="py-2.5 px-3 font-semibold text-indigo-700">{log.action}</td>
                      <td className="py-2.5 px-3 text-slate-600">{log.targetType}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Modal: Crear Nuevo Restaurante */}
      {showCreateModal && (
        <Modal
          title="Alta de Nuevo Restaurante"
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        >
          <form onSubmit={handleCreateRestaurant} className="space-y-4">
            <div className="bg-indigo-50/70 p-3 rounded-2xl border border-indigo-100 text-xs text-indigo-900 leading-relaxed">
              Al registrar el restaurante se crearán de inmediato las cuentas administrativas de <strong>Dueño</strong> y <strong>Gerente</strong>, generándose enlaces criptográficos de invitación temporal de un solo uso para que cada uno establezca su contraseña.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Restaurante *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Tacos El Pastor Sucursal Centro"
                  value={restForm.name}
                  onChange={(e) => setRestForm({ ...restForm, name: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Código / Identificador (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. pastor-centro (auto si vacío)"
                  value={restForm.code}
                  onChange={(e) => setRestForm({ ...restForm, code: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Zona Horaria Oficial *
                </label>
                <select
                  value={restForm.timezone}
                  onChange={(e) => setRestForm({ ...restForm, timezone: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white font-medium"
                >
                  <option value="America/Mexico_City">America/Mexico_City (Centro México)</option>
                  <option value="America/Cancun">America/Cancun (Quintana Roo)</option>
                  <option value="America/Tijuana">America/Tijuana (Noroeste México)</option>
                  <option value="America/Hermosillo">America/Hermosillo (Sonora)</option>
                  <option value="America/Monterrey">America/Monterrey</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Teléfono de Contacto
                </label>
                <input
                  type="text"
                  placeholder="Ej. 55 1234 5678"
                  value={restForm.phone}
                  onChange={(e) => setRestForm({ ...restForm, phone: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Administrador 1: Dueño */}
            <div className="p-3.5 bg-purple-50/60 rounded-2xl border border-purple-200/80 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-800 block">
                Cuenta del Dueño (Máxima Autoridad del Restaurante)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Don Gilberto Dueño"
                    value={restForm.ownerName}
                    onChange={(e) => setRestForm({ ...restForm, ownerName: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    placeholder="dueno@restaurante.com"
                    value={restForm.ownerEmail}
                    onChange={(e) => setRestForm({ ...restForm, ownerEmail: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Administrador 2: Gerente */}
            <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200/80 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 block">
                Cuenta del Gerente (Administrador Operativo del Restaurante)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Carlos Gerente"
                    value={restForm.managerName}
                    onChange={(e) => setRestForm({ ...restForm, managerName: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    placeholder="gerente@restaurante.com"
                    value={restForm.managerEmail}
                    onChange={(e) => setRestForm({ ...restForm, managerEmail: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creatingRest}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition shadow-soft-xs"
              >
                {creatingRest ? 'Creando restaurante…' : 'Crear Restaurante e Invitaciones'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Alta de Usuario Root */}
      {showCreateUserModal && (
        <Modal
          open={showCreateUserModal}
          onClose={() => setShowCreateUserModal(false)}
          title="Alta de Nuevo Usuario en Plataforma"
          maxWidthClass="max-w-md"
        >
          <form onSubmit={handleCreateUser} className="space-y-4 text-slate-700">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="Ej. Roberto"
                  className="w-full px-3 py-2 text-xs border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Apellidos</label>
                <input
                  type="text"
                  value={userForm.lastName}
                  onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                  placeholder="Ej. Gómez"
                  className="w-full px-3 py-2 text-xs border rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de Usuario *</label>
              <input
                type="text"
                required
                value={userForm.username}
                onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                placeholder="roberto_gerente"
                className="w-full px-3 py-2 text-xs border rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                placeholder="roberto@restaurante.com"
                className="w-full px-3 py-2 text-xs border rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Usuario *</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border rounded-xl bg-white font-medium"
                >
                  <option value="owner">Dueño (Owner)</option>
                  <option value="manager">Gerente (Manager)</option>
                  <option value="worker">Trabajador (Worker)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Restaurante</label>
                <select
                  value={userForm.restaurantId}
                  onChange={(e) => setUserForm({ ...userForm, restaurantId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-xl bg-white font-medium"
                >
                  <option value="">Plataforma Global</option>
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contraseña Inicial *</label>
              <input
                type="password"
                required
                minLength={4}
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                placeholder="Mínimo 4 caracteres"
                className="w-full px-3 py-2 text-xs border rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowCreateUserModal(false)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creatingUser}
                className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-soft-xs"
              >
                {creatingUser ? 'Registrando...' : 'Dar de Alta'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Enlaces de Invitación Generados */}
      {createdResult && (
        <Modal
          title="Restaurante Creado Exitosamente"
          open={Boolean(createdResult)}
          onClose={() => setCreatedResult(null)}
        >
          <div className="space-y-4 text-xs">
            <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 text-emerald-900 leading-relaxed">
              El restaurante <strong>{createdResult.restaurant.name}</strong> ha sido dado de alta. Se han generado tokens seguros de invitación de un solo uso con vigencia de 72 horas para establecer las contraseñas.
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="font-black text-slate-800 block text-xs mb-1">
                  Invitación para el Dueño ({createdResult.owner.name})
                </span>
                <p className="text-[11px] text-slate-500 mb-2">Correo: {createdResult.owner.email}</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}${createdResult.owner.invitationUrl}`}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-700 select-all"
                  />
                  <button
                    onClick={() => handleCopyLink(createdResult.owner.invitationUrl)}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg whitespace-nowrap active:scale-95"
                  >
                    Copiar
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="font-black text-slate-800 block text-xs mb-1">
                  Invitación para el Gerente ({createdResult.manager.name})
                </span>
                <p className="text-[11px] text-slate-500 mb-2">Correo: {createdResult.manager.email}</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}${createdResult.manager.invitationUrl}`}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-700 select-all"
                  />
                  <button
                    onClick={() => handleCopyLink(createdResult.manager.invitationUrl)}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg whitespace-nowrap active:scale-95"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setCreatedResult(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs"
              >
                Cerrar y Continuar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
