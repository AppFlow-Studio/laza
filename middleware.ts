import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

const isAdminRoute = createRouteMatcher(['/admin(.*)'])
const isEmployeeRoute = createRouteMatcher(['/employee(.*)'])
const isSuperAdminRoute = createRouteMatcher(['/super-admin(.*)'])
const isPublicRoute = createRouteMatcher([
    '/',
    '/menu(.*)',
    '/about',
    '/catering',
    '/join-us',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/auth-redirect',
    '/privacy-policy',
    '/terms-conditions',
])

export default clerkMiddleware(async (auth, req) => {
    const { userId, sessionClaims } = await auth();
    const role = (sessionClaims as any)?.o?.rol as string | undefined;
    // console.log('sessionClaims', sessionClaims);
    
    
    // Protect /super-admin/* — only super_admin can access
    if (isSuperAdminRoute(req)) {
        if (!userId) {
            return NextResponse.redirect(new URL('/sign-in', req.url));
        }
        if (role !== 'super_admin') {
            return new Response('Unauthorized', { status: 403 });
        }
        return NextResponse.next();
    }

    // Protect admin routes - only store admins can access (super_admin redirects to their dashboard)
    if (isAdminRoute(req)) {
        if (!userId) {
            return NextResponse.redirect(new URL('/sign-in', req.url));
        }
        if (role === 'super_admin') {
            return NextResponse.redirect(new URL('/super-admin', req.url));
        }
        if (role !== 'admin') {
            return new Response('Unauthorized', { status: 403 })
        }
        return NextResponse.next();
    }

    // Protect employee routes - employees and admins can access
    if (isEmployeeRoute(req)) {
        if (!userId) {
            return NextResponse.redirect(new URL('/sign-in', req.url));
        }
        if (role !== 'member' && role !== 'admin' && role !== 'super_admin') {
            return new Response('Unauthorized', { status: 403 })
        }
        return NextResponse.next();
    }

    // Auto-redirect logged-in users to their dashboard when first entering the website (home page only)
    // Allow them to navigate to other public pages freely
    const url = new URL(req.url);
    if (userId && url.pathname === '/') {
        if (role === 'admin') {
            return NextResponse.redirect(new URL('/admin', req.url));
        }
        if (role === 'member') {
            return NextResponse.redirect(new URL('/employee', req.url));
        }
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};