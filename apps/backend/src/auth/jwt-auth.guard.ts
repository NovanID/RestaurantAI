import { Injectable, ExecutionContext, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Akses ditolak: token tidak valid atau telah kedaluwarsa.',
        },
      });
    }
    return user;
  }
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
