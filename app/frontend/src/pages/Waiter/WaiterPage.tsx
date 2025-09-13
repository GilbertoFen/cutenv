import { useEffect, useState, useCallback } from "react";
import TableCard from "../../components/Waiter/TableCard";
import { getAllTables } from "../../services/TableService";
import { getTablesSocket } from "../../gateways/tableSocket";
import type { Table } from "../../types";
import Modal from "../../components/UI/Modal";
import TableDetailPanel from "../../components/Waiter/TableDetailPanel";
import type { TableStatus, TableStatusLoad } from "../../types/Waiter/waiter.types";


const WaiterPage = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  const normalizeRows = (rows: any[]): Table[] =>
    (rows ?? []).map((t: any) => ({
      id: t.id ?? t._id,
      number: Number(t.number),
      capacity: Number(t.capacity ?? 0),
      status: t.status as TableStatus,
    }));

  const refresh = useCallback(() => {
    getAllTables().then((rows: any[]) => setTables(normalizeRows(rows)));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const s = getTablesSocket();

    const onConnect = () => {
      console.log("[--- SOCKET TABLES --- waiter connected; joining global");
      s.emit("joinReception");
    };

    const onChange = (load: TableStatusLoad) => {
      console.log("ESTADO MESA CAMBIO  table status changed", load);
      setTables((prev) => {
        let index = prev.findIndex((t) => t.id === load.tableId);
        if (index === -1) index = prev.findIndex((t) => Number(t.number) === Number(load.number));

        if (index === -1) {
          const stub: Table = {
            id: load.tableId,
            number: load.number,
            capacity: 0,
            status: load.status,
          };
          const next = [stub, ...prev];
          refresh(); 
          return next;
        }

        const next = prev.slice();
        next[index] = { ...next[index], status: load.status };
        return next;
      });
    };

    s.on("connect", onConnect);
    s.on("table.status.changed", onChange);

    return () => {
      s.off("connect", onConnect);
      s.off("table.status.changed", onChange);
    };
  }, [refresh]);

  return (
    <div className="min-h-screen bg-white text-white">
      <nav className="bg-[#14144f] p-4 rounded-lg text-center text-xl font-bold ">
        Mesas Actuales
      </nav>

      <div className="p-4 flex justify-center">
        <div className="bg-white rounded-lg p-6 w-full max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {tables.map((table) => (
              <TableCard
                key={table.id}
                table={table}
                onOpen={() => setSelectedTableId(table.id)} 
              />
            ))}
          </div>
        </div>
      </div>

      <Modal
        open={!!selectedTableId}
        onClose={() => setSelectedTableId(null)}
        title={
          selectedTableId
            ? `Detalle de mesa`
            : undefined
        }
        maxWidthClass="max-w-6xl"
      >
        {selectedTableId && (
          <TableDetailPanel
            tableId={selectedTableId}
            onClose={() => setSelectedTableId(null)}
          />
        )}
      </Modal>
    </div>
  );
};

export default WaiterPage;
