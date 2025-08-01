import { Link } from "react-router-dom"

export default function Navbar() {
  return (
    <nav className="bg-[#14144f] text-white p-4 flex gap-4">
      <Link to="/" className="hover:underline">Panel de control</Link>
      <Link to="/inventory" className="hover:underline">Gestión de inventario</Link>
      <Link to="/add-product" className="hover:underline">Agregar producto</Link>
    </nav>
  )
}
