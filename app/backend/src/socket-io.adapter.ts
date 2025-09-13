import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplication } from '@nestjs/common';

export class SocketIoAdapter extends IoAdapter {
  constructor(private app: INestApplication) {
    super(app);
  }

  createIOServer(port: number, options?: any) {
    const cors = {
      origin: ['http://localhost:5173', 'http://localhost:5175'],  
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    };
    const opts = { ...options, cors };
    return super.createIOServer(port, opts);
  }
}
