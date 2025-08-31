import {
  WebSocketGateway, WebSocketServer, OnGatewayConnection,
  OnGatewayDisconnect, SubscribeMessage, MessageBody, ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

type KitchenOrderPayload = {
  id: string;
  tableNumber?: number;
  status: string;
  total: number;
  notes?: string;
  recipes: { id?: string; name: string; quantity: number; imageUrl?: string }[];
};

@WebSocketGateway({
  namespace: 'kitchen',           // el front se conecta a /kitchen
  cors: { origin: '*', credentials: true }, // ajusta para prod
})
export class KitchenGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  handleConnection(client: Socket) {
    // Aquí puedes validar JWT: client.handshake.auth?.token
  }

  handleDisconnect(client: Socket) {}

  // opcional: sala por mesa/sucursal si quieres segmentar
  @SubscribeMessage('joinKitchen')
  handleJoinKitchen(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { restaurantId?: string }
  ) {
    const room = payload?.restaurantId
      ? `kitchen:${payload.restaurantId}`
      : `kitchen:all`;
    client.join(room);
    // Si quieres, aquí puedes mandar estado inicial:
    // this.server.to(client.id).emit('orders:init', lista);
  }

  // helpers para emitir eventos
  emitToAll(event: string, data: KitchenOrderPayload | any) {
    this.server.emit(event, data);
  }

  emitToRestaurant(restaurantId: string | undefined, event: string, data: any) {
    if (!restaurantId) return this.emitToAll(event, data);
    this.server.to(`kitchen:${restaurantId}`).emit(event, data);
  }
}
