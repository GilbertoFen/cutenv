import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="bg-[#14144f] text-white rounded-xl px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-md mb-4">
      <div className="flex items-center gap-2">
        <Link to="/" className="font-extrabold text-lg tracking-tight text-white flex items-center gap-2">
          <span className="bg-indigo-600 px-2 py-0.5 rounded-lg text-xs font-black shadow-sm">POS</span>
          <span>Restaurante</span>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm font-medium">
        <Link to="/" className="hover:text-indigo-200 transition py-1 px-2.5 rounded hover:bg-indigo-900/40">
          Inicio
        </Link>
        <Link to="/inventory" className="hover:text-indigo-200 transition py-1 px-2.5 rounded hover:bg-indigo-900/40 font-bold bg-indigo-950/60 border border-indigo-700/50">
          📦 Inventario
        </Link>
        <Link to="/waiter" className="hover:text-indigo-200 transition py-1 px-2.5 rounded hover:bg-indigo-900/40">
          Mesero
        </Link>
        <Link to="/cook" className="hover:text-indigo-200 transition py-1 px-2.5 rounded hover:bg-indigo-900/40">
          Cocina
        </Link>
        <Link to="/cashier" className="hover:text-indigo-200 transition py-1 px-2.5 rounded hover:bg-indigo-900/40">
          Caja
        </Link>
        <Link to="/receptionist" className="hover:text-indigo-200 transition py-1 px-2.5 rounded hover:bg-indigo-900/40">
          Recepción
        </Link>
        <Link to="/manager" className="hover:text-indigo-200 transition py-1 px-2.5 rounded hover:bg-indigo-900/40">
          Gerencia
        </Link>
      </div>
    </nav>
  );
}
