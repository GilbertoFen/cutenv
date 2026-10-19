'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  rootLogin,
  getRootUsers,
  createRootUser,
  deleteRootUser,
  getStoredRootKey,
  clearRootSession,
} from '@/services/AuthService';
import type { User, UserRole } from '@/types';
import { AppIcon } from '@/components/icons';

export default function RootAdminPage() {
  const [rootKey, setRootKey] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // New user form state
  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    role: 'owner' as UserRole,
  });

  useEffect(() => {
    const saved = getStoredRootKey();
    if (saved) {
      setRootKey(saved);
      fetchUsers(saved);
    }
  }, []);

  const fetchUsers = async (key: string) => {
    setLoadingUsers(true);
    try {
      const data = await getRootUsers(key);
      setUsers(data);
    } catch (err: any) {
      console.error(err);
      clearRootSession();
      setRootKey(null);
      setError('Sesión root expirada o inválida.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleRootAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await rootLogin(passwordInput);
      setRootKey(passwordInput);
      await fetchUsers(passwordInput);
      setPasswordInput('');
    } catch (err: any) {
      setError(err.message || 'Contraseña de root incorrecta');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootKey) return;
    setError(null);
    setSuccess(null);

    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    setLoading(true);
    try {
      const created = await createRootUser(rootKey, form);
      setSuccess(`Usuario "${created.username}" dado de alta exitosamente con rol ${created.role === 'owner' ? 'Dueño con permisos' : 'Gerente'}.`);
      setForm({ name: '', username: '', password: '', role: 'owner' });
      await fetchUsers(rootKey);
    } catch (err: any) {
      setError(err.message || 'Error al crear usuario.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!rootKey) return;
    if (!confirm(`¿Confirmas que deseas eliminar al usuario "${name}"?`)) return;

    try {
      await deleteRootUser(rootKey, id);
      setSuccess(`Usuario eliminado.`);
      await fetchUsers(rootKey);
    } catch (err: any) {
      setError(err.message || 'Error al eliminar usuario');
    }
  };

  const handleLogoutRoot = () => {
    clearRootSession();
    setRootKey(null);
    setUsers([]);
  };

  if (!rootKey) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-700 mb-3 shadow-inner">
              <AppIcon name="lock" size={26} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Acceso Administrador Root</h1>
            <p className="text-xs text-slate-500 mt-1">
              Ruta protegida de alta seguridad. Ingrese la contraseña maestra.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleRootAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Contraseña Root
              </label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Ingrese contraseña de root..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              />
              <p className="text-[11px] text-slate-400 mt-1">Contraseña inicial por defecto: <code className="text-slate-600 font-bold">root</code></p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#14144f] hover:bg-[#1f1f6d] text-white font-bold text-sm transition-all shadow-sm disabled:opacity-60"
            >
              {loading ? 'Verificando…' : 'Acceder al Panel Root'}
            </button>

            <div className="pt-3 text-center border-t border-slate-100">
              <Link href="/login" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                ← Volver al Login General
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-100 text-amber-900 text-xs font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider">
              Root Superadmin
            </span>
            <span className="text-xs text-slate-400">Ruta Maestra Protegida</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Gestión Central de Usuarios y Permisos</h1>
          <p className="text-xs text-slate-500">
            Da de alta y gestiona usuarios autorizados con permisos de Dueño o Gerente.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            Ir al POS
          </Link>
          <button
            onClick={handleLogoutRoot}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
          >
            Cerrar Sesión Root
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Alta */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
            <AppIcon name="add" size={18} className="text-indigo-900" />
            <span>Dar de Alta Usuario</span>
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            Registra una nueva cuenta con uno de los dos tipos de permisos permitidos.
          </p>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre Completo
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. Roberto Martínez"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre de Usuario (Login)
              </label>
              <input
                type="text"
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="Ej. roberto.gerente"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mínimo 4 caracteres"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo de Permiso (Rol)
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
              >
                <option value="owner">Dueño con permisos</option>
                <option value="manager">Gerente</option>
                <option value="worker">Trabajador Operativo (Tablet)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                {form.role === 'owner'
                  ? 'Acceso total a Monitoreo y Operativa (con confirmación de gerente) y Día de Trabajo.'
                  : form.role === 'manager'
                  ? 'Acceso a supervisión gerencial, desbloqueo operativo y cancelaciones.'
                  : 'Acceso táctil optimizado para tablets: Mesero, Cocina, Cajero y Recepción sin funciones administrativas.'}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-60"
            >
              {loading ? 'Guardando…' : '+ Dar de Alta Usuario'}
            </button>
          </form>
        </div>

        {/* Lista de Usuarios */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Usuarios Registrados ({users.length})</h2>
              <p className="text-xs text-slate-500">Cuentas activas en la base de datos del restaurante</p>
            </div>
            <button
              onClick={() => rootKey && fetchUsers(rootKey)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              ↻ Actualizar lista
            </button>
          </div>

          {loadingUsers ? (
            <div className="text-center py-12 text-slate-400 text-xs">Cargando usuarios…</div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs border border-dashed rounded-xl">
              No hay usuarios registrados aún. Registra el primero desde el formulario.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 uppercase text-[11px] font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Permiso / Rol</th>
                    <th className="px-4 py-3">Fecha de Alta</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        @{u.username}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {u.name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase inline-flex items-center gap-1.5 ${
                            u.role === 'owner'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : u.role === 'manager'
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          <AppIcon name={u.role === 'owner' ? 'owner' : u.role === 'manager' ? 'manager' : 'users'} size={12} />
                          <span>
                            {u.role === 'owner'
                              ? 'Dueño con permisos'
                              : u.role === 'manager'
                              ? 'Gerente'
                              : 'Trabajador Operativo'}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition border border-rose-200 inline-flex items-center gap-1"
                        >
                          <AppIcon name="delete" size={12} />
                          <span>Eliminar</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
