import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Type,
  mixin,
} from '@nestjs/common';

export const ROLES = ['owner', 'manager', 'staff'] as const;
export type Role = (typeof ROLES)[number];

export function RequireRoles(...requiredRoles: Role[]): Type<CanActivate> {
  @Injectable()
  class RolesGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const { user } = context.switchToHttp().getRequest<{ user?: { role?: Role } }>();
      if (!user || !requiredRoles.includes(user.role as Role)) {
        throw new ForbiddenException({
          error: {
            code: 'FORBIDDEN',
            message: 'Akses ditolak untuk role ini.',
          },
        });
      }
      return true;
    }
  }

  return mixin(RolesGuard);
}
