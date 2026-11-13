// src/gateways/tables.gateway.ts
import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { TableStatusChangeLoad } from './types/gateways.types';

@WebSocketGateway({
  namespace: '/tables',
  cors: true,
})
export class TablesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  handleConnection(client: Socket) {
    console.log(`[WS /tables] Cliente conectado: ${client.id}`);
  }
  handleDisconnect(client: Socket) {
    console.log(`[WS /tables] Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('joinTable')
  joinTable(@ConnectedSocket() client: Socket, @MessageBody() load: { tableId: string }) {
    if (load?.tableId) {
      client.join(`table:${load.tableId}`);
      console.log(`[WS /tables] Cliente ${client.id} suscrito a sala: table:${load.tableId}`);
    }
    return { ok: true };
  }

  @SubscribeMessage('joinReception')
  joinReception(@ConnectedSocket() client: Socket) {
    client.join('role:reception');
    console.log(`[WS /tables] Cliente ${client.id} suscrito a sala: role:reception`);
    return { ok: true };
  }

  emitTableStatusChanged(load: TableStatusChangeLoad) {
    if (!this.server) return;
    this.server.emit('table.status.changed', load);
    this.server.to(`table:${load.tableId}`).emit('table.status.changed', load);
    this.server.to('role:reception').emit('table.status.changed', load);
  }
}
