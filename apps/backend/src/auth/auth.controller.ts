import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { CurrentUser, JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';
import { createRateLimitInterceptor } from '../common/rate-limit.service';

const LoginRateLimit = createRateLimitInterceptor({
  windowMs: 60_000,
  maxRequests: 5,
  keyPrefix: 'auth-login',
  message: 'Terlalu banyak percobaan login gagal. Silakan tunggu 1 menit.',
});

export class LoginDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  tenantSlug: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}

@Controller('admin/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseInterceptors(LoginRateLimit)
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.tenantSlug, body.email, body.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: { userId: string; tenantId: string; email: string; role: string }) {
    return { data: user };
  }
}
