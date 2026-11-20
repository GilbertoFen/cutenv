'use client';

import React, { useState } from 'react';
import { createVirtualTable, type CreateVirtualTableDto } from '@/services/TableService';
import { useNotification } from '@/context/NotificationContext';
import { AppIcon } from '@/components/icons';
import type { Table } from '@/types';

interface Props {
  initialType?: 'para_llevar' | 'domicilio' | 'telefonico';
  onClose: () => void;
  onSuccess: (table: Table) => void;
}

export default function CreateVirtualOrderModal({ initialType = 'para_llevar', onClose, onSuccess }: Props) {
  const { notify } = useNotification();
  const [tableType, setTableType] = useState<'para_llevar' | 'domicilio' | 'telefonico'>(initialType);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [phoneDeliveryMode, setPhoneDeliveryMode] = useState<'para_llevar' | 'domicilio'>('para_llevar');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);

      const resolvedAddress =
        tableType === 'domicilio' || (tableType === 'telefonico' && phoneDeliveryMode === 'domicilio')
          ? deliveryAddress.trim()
          : undefined;

      const payload: CreateVirtualTableDto = {
        tableType,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        deliveryAddress: resolvedAddress,
        deliveryNotes: deliveryNotes.trim() || undefined,
      };

      const created = await createVirtualTable(payload);
      notify.success(
        `Pedido creado con identificador ${created.virtualCode || created.number}`,
        tableType === 'para_llevar'
          ? 'Para Llevar'
          : tableType === 'domicilio'
          ? 'A Domicilio'
          : 'Telefónico'
      );

      onSuccess(created);
      onClose();
    } catch (err: any) {
      notify.error(err?.message || 'Error al crear el pedido virtual');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl border border-slate-200/90 text-slate-900 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600">
                Mesa Virtual POS
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Nuevo Pedido Sin Mesa Física
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition active:scale-95 text-lg font-bold"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Tipo de Pedido Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Tipo de Pedido
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTableType('para_llevar')}
                className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 active:scale-95 ${
                  tableType === 'para_llevar'
                    ? 'border-sky-500 bg-sky-50 text-sky-900 ring-2 ring-sky-500/30'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                  <AppIcon name="shopping-bag" size={17} />
                </div>
                <span className="text-xs font-black">Para Llevar</span>
              </button>

              <button
                type="button"
                onClick={() => setTableType('domicilio')}
                className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 active:scale-95 ${
                  tableType === 'domicilio'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/30'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <AppIcon name="bike" size={17} />
                </div>
                <span className="text-xs font-black">A Domicilio</span>
              </button>

              <button
                type="button"
                onClick={() => setTableType('telefonico')}
                className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 active:scale-95 ${
                  tableType === 'telefonico'
                    ? 'border-purple-500 bg-purple-50 text-purple-900 ring-2 ring-purple-500/30'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <AppIcon name="phone" size={17} />
                </div>
                <span className="text-xs font-black">Telefónico</span>
              </button>
            </div>
          </div>

          {/* Sub-selector for phone orders */}
          {tableType === 'telefonico' && (
            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl">
              <label className="block text-xs font-extrabold text-purple-900 mb-1.5">
                Modalidad acordada por teléfono:
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPhoneDeliveryMode('para_llevar')}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition active:scale-95 ${
                    phoneDeliveryMode === 'para_llevar'
                      ? 'bg-purple-700 text-white shadow-soft-xs'
                      : 'bg-white text-purple-800 border border-purple-200'
                  }`}
                >
                  Pasan a recoger
                </button>
                <button
                  type="button"
                  onClick={() => setPhoneDeliveryMode('domicilio')}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition active:scale-95 ${
                    phoneDeliveryMode === 'domicilio'
                      ? 'bg-purple-700 text-white shadow-soft-xs'
                      : 'bg-white text-purple-800 border border-purple-200'
                  }`}
                >
                  Envío a domicilio
                </button>
              </div>
            </div>
          )}

          {/* Cliente Info (Opcional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre del Cliente <span className="text-slate-400 font-normal">(Opcional)</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Teléfono <span className="text-slate-400 font-normal">(Opcional)</span>
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Ej. 55 1234 5678"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
            </div>
          </div>

          {/* Dirección para entrega a domicilio */}
          {(tableType === 'domicilio' || (tableType === 'telefonico' && phoneDeliveryMode === 'domicilio')) && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Dirección de Entrega <span className="text-slate-400 font-normal">(Opcional)</span>
              </label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Calle, número, colonia, referencias..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
            </div>
          )}

          {/* Notas generales del pedido */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Notas adicionales <span className="text-slate-400 font-normal">(Opcional)</span>
            </label>
            <input
              type="text"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="Ej. Empacar cubiertos, timbre descompuesto..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-soft-sm transition active:scale-95 flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Generando pedido...</span>
                </>
              ) : (
                <>
                  <AppIcon name="add" size={14} />
                  <span>Crear Pedido e Iniciar Comanda</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
