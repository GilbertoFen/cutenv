import { useEffect, useRef, useState } from 'react';
import { getCashierSocket } from '../../gateways/cashierSocket';
import { getSaleById, paySale } from '../../services/SaleService';
import { markPrinted, getTicketQueue } from '../../services/SaleService';

type OrderType = 'local' | 'para llevar' | 'evento' | 'domicilio';
type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia';

type Ticket = {
    saleId: string;
    tableId?: string;
    tableNumber?: number;
    requestedAt?: number;
};

const isOid = (s: unknown): s is string =>
    typeof s === 'string' && /^[0-9a-fA-F]{24}$/.test(s);

const dedupeBySaleId = (rows: Ticket[]): Ticket[] => {
    const seen = new Set<string>();
    const out: Ticket[] = [];
    for (const r of rows) {
        const k = String(r?.saleId ?? '');
        if (!k || seen.has(k)) continue;
        seen.add(k);
        out.push(r);
    }
    return out;
};

export default function CashierPage() {
    const [orderType, setOrderType] = useState<OrderType>('local');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
    const [queue, setQueue] = useState<Ticket[]>([]);
    const [selected, setSelected] = useState<Ticket | null>(null);
    const [sale, setSale] = useState<any>(null);
    const [printing, setPrinting] = useState(false);
    const [paying, setPaying] = useState(false);

    const socketRef = useRef<ReturnType<typeof getCashierSocket> | null>(null);

    useEffect(() => {
        const s = getCashierSocket();
        socketRef.current = s;

        const onRequested = (t: Ticket) => {
            console.log('[cashier] ticket.requested', t);
            if (!t?.saleId) return;
            setQueue(prev => dedupeBySaleId([t, ...prev]));
        };

        const onPrinted = (p: { saleId: string }) => {
            console.log('--- CASHIER SOCKET --- ticket.printed', p);
            // Mantén el ticket en la cola; sólo actualiza el detalle si está abierto
            setSale((prev: any) =>
                prev?.id === p.saleId
                    ? { ...prev, ticketStatus: 'printed', ticketPrintedAt: Date.now() }
                    : prev
            );
            // (Opcional) no quites nada de la queue aquí; se quitará al pagar.
        };

        const onPaid = (p: { saleId: string }) => {
            console.log('[cashier] sale.paid', p);
            setQueue(prev => prev.filter(x => x.saleId !== p.saleId));
            setSelected(sel => (sel?.saleId === p.saleId ? null : sel));
            setSale((prev: any) => (prev?.id === p.saleId ? null : prev));
        };

        s.on('ticket.requested', onRequested);
        s.on('ticket.printed', onPrinted);
        s.on('sale.paid', onPaid);

        // 🔽 Carga initial: requested + printed y unir
        (async () => {
            try {
                const [reqRows, prnRows] = await Promise.all([
                    getTicketQueue('requested'),
                    getTicketQueue('printed'),
                ]);

                const mapRows = (rows: any[]): Ticket[] =>
                    (rows ?? []).map(r => ({
                        saleId: r.id,
                        tableId: r.tableId,
                        tableNumber: r.tableNumber,
                        requestedAt: r.requestedAt ? new Date(r.requestedAt).getTime() : undefined,
                    }));

                const combined = dedupeBySaleId([...mapRows(reqRows), ...mapRows(prnRows)]);
                setQueue(combined);
            } catch {
                setQueue([]);
            }
        })();

        return () => {
            s.off('ticket.requested', onRequested);
            s.off('ticket.printed', onPrinted);
            s.off('sale.paid', onPaid);
        };
    }, []);


    useEffect(() => {
        (async () => {
            if (!selected) { setSale(null); return; }
            if (!isOid(selected.saleId)) {
                console.warn('[cashier] saleId inválido', selected.saleId);
                setSale(null);
                return;
            }

            const full = await getSaleById(selected.saleId);
            setSale(full);
            if (full?.orderType) setOrderType(full.orderType as OrderType);
            else setOrderType('local');

            if (full?.paymentMethod) setPaymentMethod(full.paymentMethod as PaymentMethod);
            else setPaymentMethod('efectivo');
        })();
    }, [selected]);

    const printTicket = async () => {
        if (!sale?.id) return;
        try {
            setPrinting(true);
            /*await fetch('http://localhost:5000/print', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ venta: sale }),
            });*/
            await markPrinted(sale.id);
        } catch (e) {
            console.error(e);
            alert('Error al imprimir');
        } finally {
            setPrinting(false);
        }
    };

    const confirmPayment = async () => {
        if (!sale?.id) return;
        try {
            setPaying(true);
            await paySale(sale.id, { orderType, paymentMethod });
        } catch (e) {
            console.error(e);
            alert('Error al pagar');
        } finally {
            setPaying(false);
        }
    };

    return (
        <div className="min-h-screen p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Cola de tickets */}
            <div className="bg-white rounded-2xl shadow p-4">
                <h2 className="font-bold mb-2">Tickets pendientes</h2>
                <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                    {queue.map(table => (
                        <button
                            key={table.saleId}
                            onClick={() => setSelected(table)}
                            className={`w-full text-left p-3 rounded border ${selected?.saleId === table.saleId
                                ? 'border-[#646cff] shadow-[0_0_10px_#646cff55]'
                                : ''
                                }`}
                        >
                            <div className="flex justify-between">
                                <span>Venta: {String(table.saleId).slice(-6)}</span>
                                <span>Mesa: {sale.table.number ?? '-'}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                                Solicitado:{' '}
                                {table.requestedAt ? new Date(table.requestedAt).toLocaleTimeString() : '—'}
                            </div>
                        </button>
                    ))}
                    {!queue.length && (
                        <div className="text-sm text-gray-500">Sin tickets pendientes.</div>
                    )}
                </div>
            </div>

            {/* Detalle */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow p-4">
                <h2 className="font-bold mb-2">Detalle</h2>
                {!sale && (
                    <div className="text-sm text-gray-500">Selecciona un ticket.</div>
                )}
                {sale && (
                    <>
                        <div className="flex justify-between items-center">
                            <div className="font-semibold">Folio {sale.folio}</div>
                            <div className="text-sm text-gray-500">
                                Mesa {sale.table?.number ?? selected?.tableNumber ?? '-'}
                            </div>
                        </div>

                        <div className="mt-3">
                            {(() => {
                                const grouped = (sale.orders ?? [])
                                    .flatMap((o: any) => o.items ?? [])
                                    .reduce((acc: Record<string, { qty: number; price: number }>, it: any) => {
                                        const key = it.recipe;
                                        if (!acc[key]) acc[key] = { qty: 0, price: it.price };
                                        acc[key].qty += it.quantity;
                                        return acc;
                                    }, {});
                                const keys = Object.keys(grouped);
                                return keys.length ? (
                                    <ul className="list-disc pl-5">
                                        {keys.map(name => {
                                            const { qty, price } = grouped[name];
                                            return (
                                                <li key={name} className="flex justify-between text-sm">
                                                    <span>{qty} × {name}</span>
                                                    <span>${(qty * price).toFixed(2)}</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <div className="text-xs text-gray-500">Sin items.</div>
                                );
                            })()}
                        </div>

                        <div className="mt-3 flex justify-between items-center">
                            <div className="text-lg font-bold">
                                Total ${sale.totalAmount?.toFixed?.(2) ?? '0.00'}
                            </div>
                            <div className="text-xs px-2 py-1 rounded border">
                                Ticket: {sale.ticketStatus === 'printed' ? 'impreso' : 'no impreso'}
                            </div>

                        </div>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <label className="flex-1">
                                <span className="block text-gray-600 mb-1">Tipo de orden</span>
                                <select
                                    className="w-full border rounded px-2 py-1"
                                    value={orderType}
                                    onChange={(e) => setOrderType(e.target.value as OrderType)}
                                >
                                    <option value="local">Para comer aquí</option>
                                    <option value="para llevar">Para llevar</option>
                                    <option value="evento">Evento</option>
                                    <option value="domicilio">A domicilio</option>
                                </select>
                            </label>

                            <label className="flex-1">
                                <span className="block text-gray-600 mb-1">Método de pago</span>
                                <select
                                    className="w-full border rounded px-2 py-1"
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                                >
                                    <option value="efectivo">Efectivo</option>
                                    <option value="tarjeta">Tarjeta</option>
                                    <option value="transferencia">Transferencia</option>
                                </select>
                            </label>
                        </div>

                        <div className="mt-4 flex gap-2 justify-end">
                            <button
                                onClick={printTicket}
                                disabled={printing || sale.ticketStatus === 'printed'}  // ✅ correcto
                                className="px-3 py-1 rounded bg-[#14144f] text-white disabled:opacity-60"
                            >
                                {printing
                                    ? 'Imprimiendo…'
                                    : sale.ticketStatus === 'printed'
                                        ? 'Impreso'
                                        : 'Imprimir ticket'}
                            </button>

                            <button
                                onClick={confirmPayment}
                                disabled={paying || sale.ticketStatus==='no impreso'}    // ✅ antes decía 'impreso'
                                className="px-3 py-1 rounded bg-green-600 text-white disabled:opacity-60"
                            >
                                {paying ? 'Procesando…' : 'Pagar'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
