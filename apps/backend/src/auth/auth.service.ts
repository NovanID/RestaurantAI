import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(tenantSlug: string, email: string, password: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant) {
      throw new UnauthorizedException({
        error: {
          code: 'TENANT_NOT_FOUND',
          message: 'Restoran tidak ditemukan.',
        },
      });
    }

    const staff = await this.prisma.staffUser.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email,
        },
      },
    });

    if (!staff || !staff.isActive) {
      throw new UnauthorizedException({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Email atau password salah.',
        },
      });
    }

    const isMatch = await bcrypt.compare(password, staff.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Email atau password salah.',
        },
      });
    }

    await this.prisma.staffUser.update({
      where: { id: staff.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = {
      sub: staff.id,
      tenantId: tenant.id,
      email: staff.email,
      role: staff.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      data: {
        accessToken,
        user: {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
        },
      },
    };
  }
}
