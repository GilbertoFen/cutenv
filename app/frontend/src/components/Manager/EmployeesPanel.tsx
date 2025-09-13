import { useMemo } from "react";
import type { Employee } from "../../types/Manager/manager.types";
 

// Temporal 
const MOCK: Employee[] = [
  { id: "e1", name: "María", role: "waiter", status: "on_shift", clockIn: new Date().toISOString() },
  { id: "e2", name: "José", role: "cook", status: "on_shift", clockIn: new Date().toISOString() },
  { id: "e3", name: "Luisa", role: "host", status: "off_shift" },
];

export default function EmployeesPanel() {
  const onShift = useMemo(() => MOCK.filter(e => e.status === "on_shift"), []);
  const offShift = useMemo(() => MOCK.filter(e => e.status === "off_shift"), []);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Empleados en turno</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Activos">
          <ul className="divide-y">
            {onShift.map(employee => (
              <li key={employee.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{employee.name}</div>
                  <div className="text-xs text-gray-500">
                    Rol: {employee.role} · Entrada: {employee.clockIn ? new Date(employee.clockIn).toLocaleTimeString() : "—"}
                  </div>
                </div>
                <span className="rounded-full border px-2 py-0.5 text-xs bg-green-100 border-green-200 text-green-800">
                  En turno
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Fuera de turno">
          <ul className="divide-y">
            {offShift.map(e => (
              <li key={e.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{e.name}</div>
                  <div className="text-xs text-gray-500">Rol: {e.role}</div>
                </div>
                <span className="rounded-full border px-2 py-0.5 text-xs">
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
    <div className="rounded-2xl border p-4 shadow-sm">
      <div className="mb-2 text-sm font-semibold">{title}</div>
      {children}
    </div>
  );
}
