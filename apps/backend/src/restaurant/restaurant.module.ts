import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RestaurantController } from './restaurant.controller';
import { RestaurantService } from './restaurant.service';

@Module({ imports: [AuthModule, PrismaModule], controllers: [RestaurantController], providers: [RestaurantService] })
export class RestaurantModule {}
