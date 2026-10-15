import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
@Module({ imports: [AuthModule, PrismaModule], controllers: [MenuController], providers: [MenuService] })
export class MenuModule {}
