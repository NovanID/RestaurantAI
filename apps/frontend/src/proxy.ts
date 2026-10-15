import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === '/admin/login') return NextResponse.next();

  const token = request.cookies.get('accessToken')?.value;
  if (!token) return NextResponse.redirect(new URL('/admin/login', request.url));

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
  try {
    const response = await fetch(`${apiUrl}/admin/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) return NextResponse.next();
  } catch {
    // Fail closed when the API cannot verify the session.
  }

  return NextResponse.redirect(new URL('/admin/login', request.url));
}

export const config = { matcher: '/admin/:path*' };
