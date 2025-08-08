import { Link } from "react-router-dom"

export default function Navbar() {
  return (
    <nav className="bg-[#14144f] text-white rounded p-6 flex gap-5">
      <Link to="/inventory" className="hover:underline">Panel de control</Link>
      <Link to="/waiter" className="hover:underline">Mesero</Link>
      <Link to="/add-product" className="hover:underline">Agregar producto</Link>
    </nav>
  )
}
