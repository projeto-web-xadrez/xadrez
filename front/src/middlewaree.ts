// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('session_token')?.value;
  const csrfToken = request.cookies.get('csrf_token')?.value;

  console.log(sessionToken)
  console.log("Middleware working")
  if (sessionToken && csrfToken) {

    const body_obj = new FormData()
    body_obj.append("username", localStorage.getItem('username') as string)

    // Valida com o backend
    const res = await fetch('http://localhost:8085/protected', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': `${csrfToken}`,
      },
      body: body_obj
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
