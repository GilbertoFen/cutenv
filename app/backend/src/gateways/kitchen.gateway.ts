import {
  WebSocketGateway, WebSocketServer, OnGatewayConnection,
  OnGatewayDisconnect, SubscribeMessage, MessageBody, ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

type KitchenOrderLoad = {
  id: string;
  tableNumber?: number;
  status: string;
  total: number;
  notes?: string;
  recipes: { id?: string; name: string; quantity: number; imageUrl?: string }[];
};

@WebSocketGateway({
  namespace: 'kitchen',    
  cors: { origin: '*', credentials: true }, 
})
export class KitchenGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  handleConnection(client: Socket) {}
  handleDisconnect(client: Socket) {}

  @SubscribeMessage('joinKitchen')
  handleJoinKitchen(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { restaurantId?: string }
  ) {
    const room = payload?.restaurantId
      ? `kitchen:${payload.restaurantId}`
      : `kitchen:all`;
    client.join(room);
    //this.server.to(client.id).emit('orders:init', ready);
  }

  emitToAll(event: string, data: KitchenOrderLoad | any) {
    this.server.emit(event, data);
  }

  emitToRestaurant(restaurantId: string | undefined, event: string, data: any) {
    if (!restaurantId) return this.emitToAll(event, data);
    this.server.to(`kitchen:${restaurantId}`).emit(event, data);
  }
}
