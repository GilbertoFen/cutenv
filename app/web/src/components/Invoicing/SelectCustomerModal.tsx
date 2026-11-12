'use client';

import React, { useState, useEffect } from 'react';
import { getFiscalCustomers } from '@/services/InvoicingService';
import type { FiscalCustomerData } from '@/types';
import { AppIcon } from '@/components/icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (cust: FiscalCustomerData) => void;
}

export default function SelectCustomerModal({ isOpen, onClose, onSelectCustomer }: Props) {
  const [customers, setCustomers] = useState<FiscalCustomerData[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getFiscalCustomers(search)
        .then(setCustomers)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-soft-xl border border-slate-200/90 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              Seleccionar Cliente Registrado
            </h3>
            <p className="text-xs text-slate-500">
              Busca y selecciona un cliente fiscal guardado para rellenar los datos de facturación
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <AppIcon name="close" size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="relative">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por RFC, Razón Social o correo…"
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="absolute left-3 top-3 text-slate-400">
              <AppIcon name="search" size={14} />
            </div>
          </div>
        </div>

        {/* Customers List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <div className="w-7 h-7 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Cargando clientes fiscales…
            </div>
          ) : customers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <p className="font-bold text-slate-600">No se encontraron clientes registrados</p>
              <p className="mt-1 text-[11px]">
                {search ? 'Prueba con otro término de búsqueda.' : 'Los clientes que guardes al emitir facturas aparecerán aquí.'}
              </p>
            </div>
          ) : (
            customers.map((cust) => (
              <div
                key={cust.id || cust.rfc}
                onClick={() => {
                  onSelectCustomer(cust);
                  onClose();
                }}
                className="p-3.5 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-soft-xs bg-white hover:bg-indigo-50/20 cursor-pointer transition flex items-center justify-between gap-3 active:scale-[0.99] group"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-black text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                      {cust.rfc}
                    </span>
                    <span className="text-[10px] text-slate-400">CP: {cust.postalCode}</span>
                  </div>
                  <p className="font-bold text-xs text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                    {cust.legalName}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                    <span>Régimen: {cust.taxRegime}</span>
                    {cust.email && (
                      <>
                        <span>•</span>
                        <span className="truncate">{cust.email}</span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className="min-h-[34px] px-3 py-1.5 text-xs font-black bg-indigo-50 group-hover:bg-indigo-600 text-indigo-700 group-hover:text-white rounded-xl transition shrink-0"
                >
                  Seleccionar
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
