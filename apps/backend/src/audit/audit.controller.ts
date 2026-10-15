import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditService } from './audit.service';

@Controller('admin/audit-events')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(
    @CurrentUser() user: { tenantId: string },
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
  ) {
    return this.auditService.list(user.tenantId, { entityType, action });
  }
}
