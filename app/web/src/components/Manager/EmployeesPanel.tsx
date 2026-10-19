'use client';

import { useMemo } from "react";
import type { Employee } from "@/types/Manager/manager.types";

const MOCK: Employee[] = [
  { id: "e1", name: "María", role: "waiter", status: "on_shift", clockIn: new Date().toISOString() },
  { id: "e2", name: "José", role: "cook", status: "on_shift", clockIn: new Date().toISOString() },
  { id: "e3", name: "Luisa", role: "host", status: "off_shift" },
];

export default function EmployeesPanel() {
  const onShift = useMemo(() => MOCK.filter((e) => e.status === "on_shift"), []);
  const offShift = useMemo(() => MOCK.filter((e) => e.status === "off_shift"), []);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">Control de Empleados en Turno</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Personal Activo en Turno">
          <ul className="divide-y divide-slate-100">
            {onShift.map((employee) => (
              <li key={employee.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-slate-900">{employee.name}</div>
                  <div className="text-xs text-slate-500">
                    Rol: {employee.role} · Entrada:{" "}
                    {employee.clockIn ? new Date(employee.clockIn).toLocaleTimeString() : "—"}
                  </div>
                </div>
                <span className="rounded-full border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-800">
                  En turno
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Personal Fuera de Turno">
          <ul className="divide-y divide-slate-100">
            {offShift.map((e) => (
              <li key={e.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-slate-900">{e.name}</div>
                  <div className="text-xs text-slate-500">Rol: {e.role}</div>
                </div>
                <span className="rounded-full border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600">
                  Inactivo
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-5 shadow-sm bg-white">
      <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">{title}</div>
      {children}
    </div>
  );
}
