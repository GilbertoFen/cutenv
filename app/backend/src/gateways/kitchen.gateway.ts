import {
  WebSocketGateway, WebSocketServer, OnGatewayConnection,
  OnGatewayDisconnect, SubscribeMessage, MessageBody, ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { KitchenOrderLoad } from './types/gateways.types';

@WebSocketGateway({
  namespace: 'kitchen',
  cors: true,
})
export class KitchenGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  handleConnection(client: Socket) {
    console.log(`[WS /kitchen] Cliente conectado: ${client.id}`);
  }
  handleDisconnect(client: Socket) {
    console.log(`[WS /kitchen] Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('joinKitchen')
  handleJoinKitchen(
    @ConnectedSocket() client: Socket,
    @MessageBody() load: { restaurantId?: string }
  ) {
    const room = load?.restaurantId
      ? `kitchen:${load.restaurantId}`
      : `kitchen:all`;
    client.join(room);
    console.log(`[WS /kitchen] Cliente ${client.id} suscrito a sala: ${room}`);
  }

  emitToAll(event: string, data: KitchenOrderLoad | any) {
    this.server?.emit(event, data);
  }

  emitToRestaurant(restaurantId: string | undefined, event: string, data: any) {
    if (!restaurantId) return this.emitToAll(event, data);
    this.server?.to(`kitchen:${restaurantId}`)?.emit(event, data);
  }
}
