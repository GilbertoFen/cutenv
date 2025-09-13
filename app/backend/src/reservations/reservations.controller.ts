import { Controller, Post, Body, Get, Query, Param, Patch } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dtos/create-reservation.dto';
import { QueryReservationsDto } from './dtos/query-reservations.dto';
import { AssignTableDto } from './dtos/assign-table.dto';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  create(@Body() dto: CreateReservationDto) {
    return this.reservationsService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryReservationsDto) {
    return this.reservationsService.findAll(query);
  }

  @Get('for-table/:tableId')
  getForTable(
    @Param('tableId') tableId: string,
    @Query('date') date: string,
  ) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = date || `${yyyy}-${mm}-${dd}`;
    return this.reservationsService.getForTableOnDate(tableId, dateStr);
  }

  @Get('upcoming')
  getUpcoming(@Query('hours') hours?: string, @Query('status') status?: 'programada' | 'sentada') {
    const h = hours ? Number(hours) : 48;
    return this.reservationsService.getUpcoming(h);
  }

 @Get(':id')
  getOne(@Param('id') id: string) {
    return this.reservationsService.getById(id);
  }

  @Patch(':id/assign-table')
  assign(@Param('id') id: string, @Body() dto: AssignTableDto) {
    return this.reservationsService.assignTable(id, dto);
  }

  @Patch(':id/seat')
  seat(@Param('id') id: string) {
    return this.reservationsService.seat(id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.reservationsService.cancel(id);
  }

  @Patch(':id/noshow')
  noShow(@Param('id') id: string) {
    return this.reservationsService.noShow(id);
  }

   
}
