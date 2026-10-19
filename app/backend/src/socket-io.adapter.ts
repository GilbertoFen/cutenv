import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplication } from '@nestjs/common';
import { isAllowedOrigin } from './common/utils/cors.util';

export class SocketIoAdapter extends IoAdapter {
  constructor(private app: INestApplication) {
    super(app);
  }

  createIOServer(port: number, options?: any) {
    const cors = {
      origin: (origin: string | undefined, callback: (err: Error | null, success: boolean) => void) => {
        callback(null, isAllowedOrigin(origin));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    };
    const opts = { ...options, cors };
    return super.createIOServer(port, opts);
  }
}
