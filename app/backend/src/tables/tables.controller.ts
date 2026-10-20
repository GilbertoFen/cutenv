import { Controller, Get, Param, Patch, Post, Body, Query, UseGuards } from '@nestjs/common';
import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableStatusDto } from './dto/update-table-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) { }

  @Get()
  getAllTables() {
    return this.tablesService.getAllTables();
  }

  @Get('search')
  async search(@Query() query: any) {
    return this.tablesService.searchTables(query);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'manager')
  createTable(@Body() dto: CreateTableDto) {
    return this.tablesService.createTable(dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateTableStatusDto) {
    return this.tablesService.updateTableStatus(id, dto);
  }

  @Patch(':id/release')
  releaseTable(@Param('id') id: string) {
    return this.tablesService.releaseTable(id);
  }
  @Get(':id')
  getTableById(@Param('id') id: string) {
    return this.tablesService.getTableById(id);
  }
}
