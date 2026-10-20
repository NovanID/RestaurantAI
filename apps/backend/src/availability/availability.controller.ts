import { Controller, Get, Query } from '@nestjs/common';
import { AvailabilityService } from './availability.service';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  find(
    @Query('outlet_id') outletIdSnake?: string,
    @Query('outletId') outletIdCamel?: string,
    @Query('date') date: string = '',
    @Query('time') time: string = '',
    @Query('party_size') partySizeSnake?: string,
    @Query('partySize') partySizeCamel?: string,
  ) {
    const outletId = outletIdSnake || outletIdCamel || '';
    const rawPartySize = partySizeSnake || partySizeCamel || '2';
    const partySize = parseInt(rawPartySize, 10) || 2;
    return this.availabilityService.find(outletId, date, time, partySize);
  }
}
