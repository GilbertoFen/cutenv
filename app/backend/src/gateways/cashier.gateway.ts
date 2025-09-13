import {
  WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { TicketPrintedLoad, TicketRequestedLoad, SalePaidLoad } from './types/gateways.types';

@WebSocketGateway({
  namespace: '/cashier',
  cors: {
    origin: '*',
  },
})
export class CashierGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  handleConnection(client: Socket) {
    console.log('----- Socket ---- CASHIER connected: ', client.id);
  }
  handleDisconnect(client: Socket) {
    console.log('----- Socket ---- CASHIER disconnected: ', client.id);
  }

  emitTicketRequested(request: TicketRequestedLoad) {
    this.server.emit('ticket.requested', request);
  }
  emitTicketPrinted(request: TicketPrintedLoad) {
    this.server.emit('ticket.printed', request);
  }
  emitSalePaid(request: SalePaidLoad) {
    this.server.emit('sale.paid', request);
  }
}
