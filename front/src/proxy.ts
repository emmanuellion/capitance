import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
    // Dans Next.js 15+, cookies() est asynchrone
    const cookieStore = await request.cookies;
    const accessToken = cookieStore.get('accessToken');
    const pathname = request.nextUrl.pathname;

    // Protected routes that require authentication
    const protectedRoutes = ['/dashboard', '/files', '/profile'];
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

    // Auth routes (redirect to home if already authenticated)
    const authRoutes = ['/auth/login', '/auth/register'];
    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

    // Redirect to login if accessing protected route without token
    if (isProtectedRoute && !accessToken) {
        return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // Redirect to home if accessing auth routes with token
    if (isAuthRoute && accessToken) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/files/:path*', '/profile/:path*', '/auth/:path*'],
};
