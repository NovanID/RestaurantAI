import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { AvailabilityService } from './availability.service';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  find(
    @Query('outlet_id') outletId: string,
    @Query('date') date: string,
    @Query('time') time: string,
    @Query('party_size', ParseIntPipe) partySize: number,
  ) {
    return this.availabilityService.find(outletId, date, time, partySize);
  }
}
