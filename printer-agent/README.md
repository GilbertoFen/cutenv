# Agente Local de Impresión Térmica USB para POS (ESC/POS)

Este microservicio se instala en la **computadora principal de caja** que tiene conectada físicamente la impresora térmica por USB. Permite recibir solicitudes de impresión desde el POS web (alojado en la nube) y desde las tablets de los meseros conectadas a la red Wi-Fi local.

---

## 1. Arquitectura de Conexión

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│     POS Web (Nube / HTTPS)      │       │     Tablets Meseros (Wi-Fi)     │
│   https://pos-mi-restaurante.com│       │   https://pos-mi-restaurante.com│
└────────────────┬────────────────┘       └────────────────┬────────────────┘
                 │                                         │
                 │ HTTP POST /print (localhost)            │ HTTP POST /print (LAN)
                 ▼                                         ▼
┌───────────────────────────────────────────────────────────────────────────┐
│            COMPUTADORA PRINCIPAL DE CAJA (Windows / Mac / Linux)          │
│                                                                           │
│   Agente de Impresión Local (Node.js en puerto 5001)                      │
│   IP Local: 192.168.1.100:5001                                            │
│                                                                           │
│   ┌───────────────────────────────────────────────────────────────────┐   │
│   │ Driver de Sistema / Spooler Raw ESC/POS                           │   │
│   └─────────────────────────────────┬─────────────────────────────────┘   │
└─────────────────────────────────────┼─────────────────────────────────────┘
                                      │ Cable USB
                                      ▼
                        ┌───────────────────────────┐
                        │ Impresora Térmica 80/58mm │
                        │  (Epson, Xprinter, etc.)  │
                        └───────────────────────────┘
```

---

## 2. Requisitos Previos en la PC de Caja

1. **Node.js** v16 o superior instalado en la computadora de caja.
2. La impresora térmica conectada por cable USB y encendida.
3. El controlador/driver de la impresora térmica instalado en el sistema operativo (Windows, Mac o Linux).

---

## 3. Instalación y Puesta en Marcha

### En Windows:
1. Abra la terminal (PowerShell o CMD) en la carpeta `printer-agent`.
2. Inicie el agente:
   ```powershell
   node server.js
   ```
3. Opcional (Para que inicie automáticamente al encender la PC):
   - Cree un acceso directo a `iniciar-agente.bat` en la carpeta `shell:startup` de Windows.

### En macOS / Linux:
1. Abra la terminal en la carpeta `printer-agent`:
   ```bash
   node server.js
   ```
2. Para dejarlo en segundo plano como servicio persistente:
   ```bash
   nohup node server.js > printer.log 2>&1 &
   ```

---

## 4. Variables de Entorno (Opcional)

Si desea personalizar la configuración, puede definir variables antes de ejecutar:

| Variable | Por Defecto | Descripción |
|---|---|---|
| `PRINTER_AGENT_PORT` | `5001` | Puerto HTTP donde escuchará el agente. |
| `PRINTER_AGENT_HOST` | `0.0.0.0` | `0.0.0.0` para aceptar peticiones de Tablets en red local, o `127.0.0.1` solo local. |
| `PRINTER_NAME` | *(Auto-detect)* | Nombre exacto de la impresora en el sistema (ej. `POS-80`, `EPSON TM-T20III`). Si se omite, busca automáticamente impresoras térmicas. |
| `PRINTER_AUTH_TOKEN`| `pos-local-usb-agent` | Token secreto que debe coincidir con el frontend. |
| `SIMULATION_MODE` | `false` | Si es `true`, simula la impresión guardando archivos `.txt` en `simulated_tickets/` sin enviar a hardware. |

---

## 5. Configuración en Tablets de Meseros

Cuando un mesero o cajero use una tablet (iPad, Android):
1. En la pantalla de cobro del POS, haga clic en el botón de impresión.
2. En el modal del ticket, haga clic en **"Configurar IP de Caja"**.
3. Ingrese la dirección IP local de la computadora principal (ejemplo: `http://192.168.1.100:5001`).
4. Haga clic en **Guardar**.
5. A partir de ese momento, cualquier orden o cuenta impresa desde esa tablet saldrá directamente por la impresora física de la caja.

---

## 6. Seguridad Implementada

1. **Autenticación mediante Token:** Las peticiones deben incluir la cabecera `X-POS-Print-Token`.
2. **Operación de Solo Lectura:** El agente no tiene acceso a la base de datos de MongoDB ni puede alterar saldos, precios o inventario.
3. **Protección contra duplicados (Idempotencia):** El agente ignora reintentos automáticos de red para el mismo folio/venta/orden dentro de una ventana de 10 segundos, evitando que salgan dos tickets o comandas por error de conexión.
4. **Respaldo de Fallo:** Si la impresora física se queda sin papel o se desconecta, el agente almacena el ticket formateado en `printer-agent/simulated_tickets/` para que no se pierda la información y devuelve un error claro a la interfaz.

---

## 7. Impresión Automática de Comandas en Cocina (`TICKET_A_COCINA`)

El sistema cuenta con un flujo automático e invisible para imprimir comandas en cocina al momento en que se envía un pedido:

1. **Sin botones visibles:** Ocurre de forma automática y transparente en segundo plano cuando el mesero confirma la orden o cuando la pantalla de cocina (KDS) recibe el pedido en tiempo real.
2. **Variable de control `TICKET_A_COCINA`:**
   - Si `TICKET_A_COCINA=TRUE`: Se despacha automáticamente el ticket de comanda a la impresora física USB con corte de papel (sin precios ni datos fiscales, destacando platillos, cantidades y notas).
   - Si `TICKET_A_COCINA=FALSE`: El flujo de auto-impresión de comandas se omite por completo.
3. **Independencia de flujos:** Esta funcionalidad es completamente independiente de la impresión de cuentas de cliente en caja (el cual mantiene su botón explícito de "Imprimir Ticket" / "Reimprimir Ticket" en `/cashier`).
