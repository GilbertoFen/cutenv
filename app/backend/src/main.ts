import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { join } from 'path';
import helmet from 'helmet';
import { SocketIoAdapter } from './socket-io.adapter';
import { isAllowedOrigin } from './common/utils/cors.util';

async function bootstrap() {
  // Desactiva CORS aquí para crearlo tú explícito
  const app = await NestFactory.create(AppModule, { cors: false });

  // CORS para HTTP (REST)
  app.enableCors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Petición bloqueada para origen no permitido: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  });

  // CORS para WebSocket/Socket.IO (fundamental)
  app.useWebSocketAdapter(new SocketIoAdapter(app));

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true
  }))

  app.use(helmet())

  app.setGlobalPrefix("api")

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Server running on port ${port}`);
}
bootstrap();
