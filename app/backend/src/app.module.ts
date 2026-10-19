import { Module } from '@nestjs/common';
import { ProductModule } from './products/products.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { RecipesModule } from './recipes/recipes.module';
import { TablesModule } from './tables/tables.module';
import { OrdersModule } from './orders/orders.module';
import { SalesModule } from './sales/sales.module';
import { ReservationsModule } from './reservations/reservations.module';
import { AuthModule } from './auth/auth.module';
import { InvoicingModule } from './invoicing/invoicing.module';
import { PromotionsModule } from './promotions/promotions.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV}`,
        '.env',
        '../.env',
        '../../atlas-credentials.env',
        '../atlas-credentials.env',
      ],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        let uri =
          configService.get<string>('MONGODB_PATH') ||
          configService.get<string>('MONGODB_URI');

        if (!uri) {
          throw new Error(
            'Falta la variable de entorno MONGODB_PATH o MONGODB_URI para la conexión a la base de datos.'
          );
        }

        const dbName = configService.get<string>('MONGODB_DB_NAME') || 'restaurant';

        // Asegurar base de datos correcta en URIs de Atlas
        if (
          uri.startsWith('mongodb+srv://') &&
          !uri.includes('.mongodb.net/') &&
          !uri.includes('.mongodb.net/' + dbName)
        ) {
          uri = uri.replace('.mongodb.net', `.mongodb.net/${dbName}?retryWrites=true&w=majority`);
        } else if (uri.startsWith('mongodb+srv://') && uri.endsWith('.mongodb.net')) {
          uri = `${uri}/${dbName}?retryWrites=true&w=majority`;
        }

        // Sanitizar URI en logs para proteger credenciales
        const sanitizedUri = uri.replace(/\/\/[^:]+:[^@]+@/, '//****:****@');
        console.log(`[MongooseModule] Conectando a MongoDB: ${sanitizedUri} (DB: ${dbName})`);

        return {
          uri,
          dbName,
          serverSelectionTimeoutMS: 10000,
          connectionFactory: (connection) => {
            connection.on('connected', () => {
              console.log(
                `[MongooseModule] ¡Conexión establecida con éxito a MongoDB Atlas! (Base de datos: ${connection.name})`
              );
            });
            connection.on('disconnected', () => {
              console.warn('[MongooseModule] Conexión a MongoDB Atlas desconectada.');
            });
            connection.on('error', (err: any) => {
              console.error('[MongooseModule] Error de conexión a MongoDB Atlas:', err?.message || err);
            });
            return connection;
          },
        };
      },
    }),
    ScheduleModule.forRoot(),
    ProductModule,
    RecipesModule,
    TablesModule,
    OrdersModule,
    SalesModule,
    ReservationsModule,
    AuthModule,
    InvoicingModule,
    PromotionsModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
