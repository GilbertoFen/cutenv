import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Dashboard from "./pages/Dashboard"
import Inventory from "./pages/Inventory"
import AddProduct from "./pages/AddProduct"
import Navbar from "./components/Navbar"
 

export default function App() {
  return (
    <Router>
      <Navbar />
      <div className="p-4">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/inventory/:category" element={<Inventory />} />
          <Route path="/inventory/add-product" element={<AddProduct />} />
        </Routes>
      </div>
    </Router>
  )
}
