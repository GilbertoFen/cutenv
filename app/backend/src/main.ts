import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { join } from 'path';
import helmet from 'helmet';
import { SocketIoAdapter } from './socket-io.adapter';
async function bootstrap() {
  // Desactiva CORS aquí para crearlo tú explícito
  const app = await NestFactory.create(AppModule, { cors: false });

  // CORS para HTTP (REST)
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:5175'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // CORS para WebSocket/Socket.IO (fundamental)
  app.useWebSocketAdapter(new SocketIoAdapter(app));

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true
  }))

  app.use(helmet())

  app.setGlobalPrefix("api")


  await app.listen(process.env.PORT ?? 3000);
  console.log(`Server running on port ${process.env.PORT ?? 3000}`);
}
bootstrap();
