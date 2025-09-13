import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import AddProduct from "./pages/AddProduct";
import Navbar from "./components/Navbar";
import WaiterPage from "./pages/Waiter/WaiterPage";
//import TableDetailPage from "./pages/Waiter/TableDetailPage";
import CookPage from "./pages/Cook/CookPage";
import ManagerPage from "./pages/Manager/ManagerPage"
import ReceptionistPage from "./pages/Receptionist/ReceptionistPage";
import ReservationsPage from "./pages/Receptionist/ReservationsPage";
import CashierPage from "./pages/Cashier/CashierPage";

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
          <Route path="/waiter" element={<WaiterPage />} />
          {/*<Route path="/waiter/table/:id" element={<TableDetailPage />} />*/}
          <Route path="/cook" element={<CookPage />} />
          <Route path="/manager" element={<ManagerPage />} />
          <Route path="/receptionist" element={<ReceptionistPage/>} />
          <Route path= "/reception/reservations" element= {<ReservationsPage /> }/>
          <Route path="/cashier" element = {<CashierPage/>} />

          <Route path="*" element={<div>Ruta no encontrada</div>} />
        </Routes>
      </div>
    </Router>
  );
}
