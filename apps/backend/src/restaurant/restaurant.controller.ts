import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, Delete } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequireRoles } from '../auth/roles.guard';
import { RestaurantService } from './restaurant.service';
import { CreateOutletDto, UpdateOutletDto, CreateTableDto, UpdateTableDto, CreateAreaDto } from './dto';

type User = { tenantId: string };

@Controller()
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  @Get('outlets')
  outlets(@Query('tenant_id') tenantId?: string) { 
    return this.restaurantService.outlets(tenantId); 
  }

  @Get('admin/outlets') 
  @UseGuards(JwtAuthGuard)
  adminOutlets(@CurrentUser() user: User) { 
    return this.restaurantService.outlets(user.tenantId); 
  }

  @Get('admin/outlets/:id')
  @UseGuards(JwtAuthGuard)
  outlet(@CurrentUser() user: User, @Param('id') id: string) {
    return this.restaurantService.outlet(user.tenantId, id);
  }

  @Post('admin/outlets') 
  @UseGuards(JwtAuthGuard, RequireRoles('owner', 'manager'))
  createOutlet(@CurrentUser() user: User, @Body() dto: CreateOutletDto) { 
    return this.restaurantService.createOutlet(user.tenantId, {
      name: dto.name,
      slug: dto.slug,
      address: dto.address,
      city: dto.city,
      phone: dto.phone,
      whatsapp: dto.whatsapp,
      email: dto.email,
    }); 
  }

  @Patch('admin/outlets/:id') 
  @UseGuards(JwtAuthGuard, RequireRoles('owner', 'manager'))
  updateOutlet(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateOutletDto) { 
    return this.restaurantService.updateOutlet(user.tenantId, id, dto); 
  }

  @Post('admin/outlets/:id/opening-hours') 
  @UseGuards(JwtAuthGuard, RequireRoles('owner', 'manager'))
  saveOpeningHours(@CurrentUser() user: User, @Param('id') id: string, @Body() hours: Array<{ weekday: number; openTime: string; closeTime: string; isClosed?: boolean }>) {
    return this.restaurantService.saveOpeningHours(user.tenantId, id, hours); 
  }

  @Get('admin/outlets/:id/opening-hours')
  @UseGuards(JwtAuthGuard)
  openingHours(@CurrentUser() user: User, @Param('id') id: string) {
    return this.restaurantService.openingHours(user.tenantId, id);
  }

  @Get('admin/outlets/:id/areas') 
  @UseGuards(JwtAuthGuard)
  areas(@CurrentUser() user: User, @Param('id') id: string) { 
    return this.restaurantService.areas(user.tenantId, id); 
  }

  @Post('admin/outlets/:id/areas') 
  @UseGuards(JwtAuthGuard, RequireRoles('owner', 'manager'))
  createArea(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: CreateAreaDto) { 
    return this.restaurantService.createArea(user.tenantId, id, dto.name); 
  }

  @Get('admin/outlets/:id/tables') 
  @UseGuards(JwtAuthGuard)
  tables(@CurrentUser() user: User, @Param('id') id: string) { 
    return this.restaurantService.tables(user.tenantId, id); 
  }

  @Post('admin/outlets/:id/tables') 
  @UseGuards(JwtAuthGuard, RequireRoles('owner', 'manager'))
  createTable(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: CreateTableDto) { 
    return this.restaurantService.createTable(user.tenantId, id, {
      tableNumber: dto.tableNumber,
      capacity: dto.capacity,
      areaId: dto.areaId,
    }); 
  }

  @Patch('admin/tables/:id') 
  @UseGuards(JwtAuthGuard, RequireRoles('owner', 'manager'))
  updateTable(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateTableDto) { 
    return this.restaurantService.updateTable(user.tenantId, id, {
      tableNumber: dto.tableNumber,
      capacity: dto.capacity,
      areaId: dto.areaId,
      status: dto.status,
    }); 
  }
}
