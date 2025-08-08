import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Table, TableSchema } from '../schemasMongo/table.schema';
import { TablesService } from './tables.service';
import { TablesController } from './tables.controller';
import { SalesModule } from '../sales/sales.module';  

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Table.name, schema: TableSchema },
    ]),
    SalesModule
  ],
  controllers: [TablesController],
  providers: [TablesService],
  exports: [TablesService]
})
export class TablesModule {}
