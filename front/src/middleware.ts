// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('session_token')?.value;
  console.log("Middleware working")
  if (sessionToken) {
    // Valida com o backend
    const res = await fetch('http://localhost:8085/validate-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
    });

    const isValid = res.ok;

    if (isValid && request.nextUrl.pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    if (!isValid && request.nextUrl.pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  } else {
    // No token: block access to protected pages
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/dashboard'],
};
