import { NextResponse, type NextRequest } from 'next/server';

/**
 * Check if user is authenticated and redirect to login if not
 */
export function requireAuth(request: NextRequest): NextResponse | null {
  const token = request.cookies.get('accessToken')?.value || 
                localStorage.getItem('accessToken'); // For SSR context
  
  if (!token) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  return null; // User is authenticated, continue
}

/**
 * Verify JWT token and extract user data
 */
export async function verifyToken(token: string) {
  try {
    // Split JWT into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    // Decode payload (second part)
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8')
    );

    // Check expiration
    const currentTime = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < currentTime) {
      throw new Error('Token expired');
    }

    return {
      valid: true,
      user: {
        userId: payload.sub,
        tenantId: payload.tenantId,
        email: payload.email,
        role: payload.role,
      },
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Role-based authorization
 */
export function requireRole(requiredRoles: string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      // Get token from request
      const token = args[0]?.cookies?.get('accessToken')?.value || 
                    args[0]?.headers?.get('authorization')?.replace('Bearer ', '');
      
      if (!token) {
        throw new Error('Unauthorized');
      }

      const verification = await verifyToken(token);
      
      if (!verification.valid || !verification.user) {
        throw new Error('Invalid or expired token');
      }

      // Check role
      const userRole = verification.user.role;
      if (!requiredRoles.includes(userRole)) {
        throw new Error('Forbidden: insufficient permissions');
      }

      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

/**
 * Store token in cookies for server-side use
 */
export function setAccessToken(response: NextResponse, token: string) {
  response.cookies.set({
    name: 'accessToken',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 15, // 15 minutes
    path: '/',
  });
}

/**
 * Clear authentication tokens
 */
export function clearAuthTokens(response: NextResponse) {
  response.cookies.set({
    name: 'accessToken',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: -1,
    path: '/',
  });
  
  response.cookies.set({
    name: 'tenantSlug',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: -1,
    path: '/',
  });
}
