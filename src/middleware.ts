import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
    function middleware(req) {
        // 1. Password Change Enforcement
        const token = req.nextauth.token;
        const isSetupPage = req.nextUrl.pathname === "/auth/setup-password";

        if (token?.mustChangePassword && !isSetupPage) {
            return NextResponse.redirect(new URL("/auth/setup-password", req.url));
        }

        // 2. Role based protection
        if (req.nextUrl.pathname.startsWith("/admin") && token?.role !== "ADMIN") {
            return NextResponse.rewrite(new URL("/403", req.url))
        }
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
        pages: {
            signIn: "/login",
        },
    }
)

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - login (Login page)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|login|_next/static|_next/image|favicon.ico).*)',
    ],
}
