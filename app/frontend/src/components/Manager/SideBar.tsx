export default function Sidebar({
  active,
  onSelect,
}: {
  active: "employees" | "sales" | "summary" | "inventory";
  onSelect: (t: "employees" | "sales" | "summary" | "inventory") => void;
}) {
  const Item = ({
    id,
    label,
  }: {
    id: "employees" | "sales" | "summary" | "inventory";
    label: string;
  }) => {
    const isActive = active === id;
    return (
      <button
        onClick={() => onSelect(id)}
        className={`w-full rounded-xl px-3 py-2 text-left text-sm transition
          ${isActive ? "bg-gray-100 font-medium" : "hover:bg-gray-50"}`}
      >
        {label}
      </button>
    );
  };

  return (
    <aside className="w-[200px] shrink-0 border-r p-3">
      <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Menú
      </div>
      <nav className="space-y-1">
        <Item id="employees" label="Empleados en turno" />
        <Item id="sales" label="Ventas del día" />
        <Item id="summary" label="Resumen diario" />
        <Item id="inventory" label="Inventario" />
      </nav>
    </aside>
  );
}
