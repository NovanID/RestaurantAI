import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ListReservationsDto } from './dto/list-reservations.dto';
import { RejectReservationDto } from './dto/reject-reservation.dto';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { VerifyReservationDto } from './dto/verify-reservation.dto';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';

type AuthenticatedUser = { tenantId: string; userId: string };

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  create(@Body() body: CreateReservationDto) {
    return this.reservationsService.create(body);
  }

  @Post('verify')
  verify(@Body() body: VerifyReservationDto) {
    return this.reservationsService.verify(body.code, body.phoneLast4);
  }

  @Patch(':code')
  update(@Param('code') code: string, @Body() body: UpdateReservationDto) {
    return this.reservationsService.update(code, body);
  }

  @Post(':code/cancel')
  cancel(@Param('code') code: string, @Body() body: CancelReservationDto) {
    return this.reservationsService.cancel(code, body.phoneLast4);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListReservationsDto) {
    return this.reservationsService.list(user.tenantId, query);
  }

  @Post('admin/:id/approve')
  @UseGuards(JwtAuthGuard)
  approve(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.reservationsService.approve(user.tenantId, user.userId, id);
  }

  @Post('admin/:id/reject')
  @UseGuards(JwtAuthGuard)
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: RejectReservationDto,
  ) {
    return this.reservationsService.reject(user.tenantId, user.userId, id, body.reason);
  }
}
