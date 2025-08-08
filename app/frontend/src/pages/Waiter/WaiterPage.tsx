import { useEffect, useState } from "react";
import TableCard from "../../components/Waiter/TableCard";
import { getAllTables } from "../../services/TableService";

const WaiterPage = () => {
  console.log("WaiterPage render");
  const [tables, setTables] = useState([]);

  useEffect(() => {
    getAllTables().then(setTables);
  }, []);

  return (
    <div className="min-h-screen bg-white text-white">
      <nav className="bg-[#14144f] p-4 rounded-lg text-center text-xl font-bold ">
        Mesas Actuales
      </nav>

      <div className="p-4 flex justify-center">
        <div className="bg-white rounded-lg p-6 w-full max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {tables.map((table) => (
              <TableCard key={table["_id"]} table={table} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaiterPage;
