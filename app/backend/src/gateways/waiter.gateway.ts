import {
    WebSocketGateway, WebSocketServer, OnGatewayConnection,
    OnGatewayDisconnect, SubscribeMessage, MessageBody, ConnectedSocket
} from "@nestjs/websockets";

import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    namespace: 'waiter',
    cors: true,
})

export class WaiterGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;

    handleConnection(client: Socket) {
        console.log('----- Socket ---- WAITER connected: ', client.id);
    }

    handleDisconnect(client: Socket) {
        console.log('----- Socket ---- WAITER connected: ', client.id);
    }

    @SubscribeMessage('joinWaiter')
    handleJoinWaiter(
        @ConnectedSocket() client: Socket,
        @MessageBody() load: { waiterId?: string, tableIds?: string[] }
    ) {
        if (load?.waiterId) {
            client.join(`waiter:${load.waiterId}`);
        }
        (load?.tableIds ?? []).forEach(tid => client.join(`table:${tid}`));
        return { ok: true }
    }

    emitToWaiter(waiterId: string, event: string, data: any) {
        this.server?.to(`waiter:${waiterId}`)?.emit(event, data);
    }

    emitToTable(tableId: string, event: string, data: any) {
        console.log('----- SOCKET ---- WAITER emitToTable:', `table:${tableId}`, event, { id: data?.id, status: data?.status });
        this.server?.to(`table:${tableId}`)?.emit(event, data);
    }

    emitToAll(event: string, data: any) {
        console.log('----- SOCKET ---- WAITER  emitToAll:', event, { id: data?.id, status: data?.status });
        this.server?.emit(event, data);
    }


}